#!/usr/bin/env python3
# encoding: utf8
from __future__ import unicode_literals
import os
import re
import json
import codecs
import argparse
import datetime
import subprocess


ENCODING = 'utf-8'


# MACROS defines what we search for in the LaTeX code.
LISTS = 'Persongalleri Rekvisitter Lydeffekter'.split()
SCENES = 'Sang Sketch'.split()
MACROS = [
    ('begin_band', r'\\begin{Bandkommentar}'),
    ('end_band', r'\\end{Bandkommentar}'),
    ('begin_list', r'\\begin{(?:%s)}' % '|'.join(LISTS)),
    ('end_list', r'\\end{(?:%s)}' % '|'.join(LISTS)),
    ('begin_scene',
     r'\\begin{(?P<scenekind>%s)}(?:\[(?P<melody>[^]]+)\])?{(?P<title>[^}]+)}'
     % '|'.join(SCENES)),
    ('end_scene', r'\\end{(?:%s)}' % '|'.join(SCENES)),
    ('item', r'\\item *[^\n]+'),
    ('input', r'\\input{[^}]*}'),
    ('tid', r'\\tid{[^}]*}'),
    ('sceneskift', r'\\(?:forscene|fuldscene){[^}]*}'),
    ('comment', r'%.*'),
]

# Regular expression built from MACROS.
# Each (k, r)-pair in MACROS becomes a capture group in the regex.
PARSER = re.compile(
    '|'.join('(?P<%s>%s)' % macro for macro in MACROS),
    re.M)


def parse(filename):
    """Given a filename, yield capture groups according to PARSER.

    Handles recursive input using recursion.
    """

    if isinstance(filename, list):
        for f in filename:
            for each in parse(f):
                yield each
        return

    try:
        fp = codecs.open(filename, encoding=ENCODING)
    except OSError:
        return

    with fp:
        i = 0
        s = fp.read()
        for o in PARSER.finditer(s):
            j = o.start()
            if i != j:
                yield (None, s[i:j], None, filename)
            i = o.end()
            key = o.lastgroup
            value = o.group(key)
            if key == 'input':
                filename = value[7:-1]
                if '.' not in filename:
                    filename += '.tex'
                # Here, we could use `yield from` in Py3k
                for each in parse(filename):
                    yield each
            else:
                yield (key, value, o, filename)


def parse_manus(filename):
    """Given a root filename, iterate over scenes.

    The scenes are represented as dicts with keys
    kind, title, melody, parts,
    and subkeys
    parts.Persongalleri, parts.Rekvisitter, parts.Lydeffekter.
    """
    current_text = None
    current_list = None
    current = None
    for key, value, match, current_file in parse(filename):
        if key == 'begin_scene':
            current = {
                'kind': match.group('scenekind'),
                'title': match.group('title'),
                'melody': match.group('melody'),
                'parts': {key: [] for key in LISTS},
                'band': [],
                'tid': None,
                'sceneskift': [],
                'filename': current_file,
            }
        elif key == 'end_scene':
            if not current['title'].startswith('Liste over '):
                yield current
        elif key == 'begin_list':
            part = value[7:-1]
            current_list = current['parts'][part]
        elif key == 'end_list':
            current_list = None
        elif key == 'begin_band':
            current_text = current['band']
        elif key == 'end_band':
            current_text = None
        elif key == 'item':
            if current_list is not None:
                current_list.append(value[5:].strip())
        elif key == 'tid':
            current['tid'] = value[5:-1]
        elif key is None:
            if current_text is not None:
                current_text.append(value)
        elif key == 'sceneskift':
            brace = value.index('{')
            kind = value[1:brace]
            props = value[brace + 1:-1]
            current['sceneskift'].append((kind, props))


def write_list(scenes, filename, list_name, marker):
    """Write a list of scene things to a file."""

    print('')
    print(os.path.basename(filename))
    with codecs.open(filename, 'w', encoding=ENCODING) as fp:
        fp.write(''.join('%s\n' % line for line in [
            r'% This file was autogenerated by lists.py.',
            r'% Do not edit!',
            r'\begingroup',
            r'\newenvironment{scene}{ %',
            r'  \vspace{-0.1cm}',
            r'  \begin{list}{%s}{ %%' % marker,
            r'    \setlength{\itemsep}{0mm} %',
            r'    \setlength{\parsep}{0mm} %',
            r'  }}{ %',
            r'  \end{list} %',
            r'  }',
        ]))
        for scene in scenes:
            vals = scene['parts'][list_name]
            if vals:
                fp.write(r'\subsection*{%s}' % scene['title'] + '\n')
                fp.write(r'\begin{scene}' + '\n')
                for v in vals:
                    fp.write(r'\item %s' % v + '\n')
                fp.write(r'\end{scene}' + '\n')
        fp.write(r'\endgroup' + '\n')

        if list_name == 'Persongalleri':
            count = sum(len(scene['parts'][list_name]) for scene in scenes)
            fp.write(
                '\n\\vspace{2cm}\n\n' +
                '\\noindent Total antal roller i revyen: %s\n\n' % count)


def remove_latex(s):
    s = s.strip()
    s = re.sub(r'_', ' ', s).strip()
    s = re.sub(r'\$', '', s).strip()
    return s


def read_legend():
    with open('legend.json') as fp:
        return json.load(fp)


def write_legend(legend):
    with open('legend.json', 'w') as fp:
        json.dump(legend, fp, sort_keys=True, indent=0, ensure_ascii=False)


def add_legend(scenes):
    legend = read_legend()
    for scene in scenes:
        try:
            s = legend[scene['title']]
        except KeyError:
            s = ''
        scene['legend'] = s or scene['title']
        legend[scene['title']] = (
            scene['legend'] if scene['legend'] != scene['title'] else '')
    write_legend(legend)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-d', '--directory')
    parser.add_argument('-a', '--all', action='store_true')
    args = parser.parse_args()

    if args.directory is not None:
        filenames = os.listdir(args.directory)
        paths = [os.path.join(args.directory, f)
                 for f in filenames
                 if f.endswith('.tex')]
        scenes = list(parse_manus(paths))
    elif args.all:
        paths = []
        for d in 'sange sketches fisk'.split():
            filenames = os.listdir(d)
            paths += [os.path.join(d, f)
                      for f in filenames
                      if f.endswith('.tex')]
        scenes = list(parse_manus(paths))
    else:
        scenes = list(parse_manus('manus.tex'))

    add_legend(scenes)

    print('\nscenes.json')
    with open('lister/scenes.json', 'w') as fp:
        json.dump(scenes, fp, indent=2, sort_keys=True)

    # for scene in scenes:
    #     if scene['title'].startswith('Liste over '):
    #         continue
    #     print('{title} ({kind}, {melody})'.format(**scene))
    #     for key in LISTS:
    #         vals = scene['parts'][key]
    #         if vals:
    #             print('%s:' % key)
    #             for v in vals:
    #                 print('  - %s' % v)
    #             print('')

    write_list(
        scenes, 'lister/roller.tex',
        list_name='Persongalleri',
        marker=r'$\bullet$',
        )

    write_list(
        scenes, 'lister/rekvisitter.tex',
        list_name='Rekvisitter',
        marker=r'$\Box$',
        )

    write_list(
        scenes, 'lister/lyde.tex',
        list_name='Lydeffekter',
        marker=r'\ForwardToEnd',
        )

    males = females = 0

    print('\nrolleliste.txt')
    with codecs.open('lister/rolleliste.txt', 'w', encoding=ENCODING) as fp:
        for scene in scenes:
            title = scene['legend']
            title = re.sub(r'\$ \\cdot \$', '', title)
            if title.startswith('Fuck det sexistiske'):
                title = 'Fuck det sexistiske samfund'
            title = remove_latex(title)
            title = title.strip(' !?.')
            if ':' in title:
                print("%r: Kolon er forbudt i titel!" % (scene['filename'],))
            if title == 'Navn':
                print('%r: Ugyldigt navn!' % (scene['filename'],))
            parts = []
            if not scene['parts']['Persongalleri']:
                print("%r: Ingen roller!" % (scene['filename'],))
            for part in scene['parts']['Persongalleri']:
                if r'\dreng' in part and r'\pige' in part:
                    print(r"%r: %r: Både \dreng og \pige" %
                          (scene['filename'], part))
                elif r'\dreng' in part:
                    males += 1
                elif r'\pige' in part:
                    females += 1
                part = part.strip(' .')
                part = re.sub(r'\\dreng|\\pige', '', part).strip()
                part = re.sub(r'^[([][A-Z]+[0-9]*[])]|[([][A-Z]+[0-9]*[])]$',
                              '', part).strip()
                part = re.sub(r'\([^)]*\)$',
                              '', part).strip()
                part = remove_latex(part)
                if part.lower() in parts:
                    print("%r: Duplikatrolle %r" % (scene['filename'], part))
                parts.append(part.lower())
                if ',' in part:
                    print("%r: %r: Komma er forbudt i rollenavn!" %
                          (scene['filename'], part))

                fp.write('%s: %s\n' % (title, part))
    with codecs.open('lister/roller.tex', 'a', encoding=ENCODING) as fp:
        fp.write(r'\noindent Kønsfordeling: %s \dreng, %s \pige' %
                 (males, females) + '\n')

    print('\nsange.txt')
    with codecs.open('lister/sange.txt', 'w', encoding=ENCODING) as fp:
        for scene in scenes:
            if scene['kind'] == 'Sang' or scene['band']:
                fp.write(79 * '=' + '\n')
                fp.write('%s\n' % (scene['title'],))
                fp.write('Melodi: %s\n' % (scene['melody'],))
                if scene['band']:
                    fp.write(''.join('%s\n' % line for line in scene['band']))
                else:
                    print("%r: Ingen bandkommentarer!" % (scene['filename'],))

    print('\ntid.txt')
    with codecs.open('lister/tid.txt', 'w', encoding=ENCODING) as fp:
        total_seconds = 0
        fail = []
        for scene in scenes:
            fp.write('%7s ' % datetime.timedelta(seconds=total_seconds))
            if scene['tid'] is None:
                print(r"%r har ikke angivet \tid" %
                      (scene['filename'],))
                fail.append(scene['legend'])
            else:
                try:
                    minute, second = scene['tid'].split(':', 1)
                    total_seconds += float(minute) * 60 + float(second)
                except:
                    print("%r: Ugyldig tid %r" % (scene['filename'], scene['tid']))
                    fail.append(scene['legend'])
            fp.write('%s %s\n' % (scene['tid'], scene['legend']))
        fp.write('I alt: %s%s\n' %
                 (datetime.timedelta(seconds=total_seconds),
                  ''.join(' + %s' % legend for legend in fail)))

    print('\ntidslinje.tex')
    with codecs.open('lister/tidslinje.tex', 'w', encoding=ENCODING) as fp:
        fail = []
        for scene in scenes:
            if scene['tid'] is None:
                seconds = 300
                output_tid = '???'
            else:
                try:
                    minute, second = scene['tid'].split(':', 1)
                    seconds = float(minute) * 60 + float(second)
                    output_tid = scene['tid']
                except:
                    seconds = 300
                    output_tid = '???'
            width = seconds * 1  # 60 seconds = 60pt
            fp.write(r'\%s{%spt}{%s %s}' %
                     (scene['kind'], width, output_tid,
                      remove_latex(scene['legend'])) + '\n')

    print('\nroller.csv')
    with codecs.open('lister/roller.csv', 'w', encoding=ENCODING) as fp:
        # fp.write('Titel\tRolle\tStr.\tType\tRevyist\n')
        for scene in scenes:
            scene_kind = scene['kind']
            legend = remove_latex(scene['legend'])
            for part in scene['parts']['Persongalleri']:
                part = remove_latex(part)
                fp.write('"%s"\t"%s"\t"Stor"\t"%s"\t\n' %
                         (legend, part, scene_kind))

    print('\nsceneskift.csv')
    with codecs.open('lister/sceneskift.csv', 'w', encoding=ENCODING) as fp:
        prev = None
        prev_title = None
        for scene in scenes:
            if not scene['sceneskift']:
                print('%r: Ingen sceneskift' % (scene['filename'],))
                continue
            first_kind = scene['sceneskift'][0][0]
            if first_kind == prev == 'fuldscene':
                print('%r -> %r: Fuld scene til fuld scene i overgang' %
                      (prev_title, scene['filename']))
                prev = None
            for kind, props in scene['sceneskift']:
                if kind == prev == 'fuldscene':
                    print('%r: Fuld scene til fuld scene' %
                          (scene['filename'],))
                fp.write('%s\t%s\t%s\n' %
                         (scene['legend'], kind, props))
                prev = kind
            prev_title = scene['legend']

    if not args.all and args.directory is None:
        print('\npdflatex')
        try:
            command = ('latexmk', '-pdf', '-interaction=batchmode', 'manus.tex')
            subprocess.check_call(command)
            command = ('latexmk', '-pdf', '-interaction=batchmode', 'tidslinje-master.tex')
            subprocess.check_call(command)
        except subprocess.CalledProcessError:
            print("\npdflatex fejlede :-(")


if __name__ == "__main__":
    main()
