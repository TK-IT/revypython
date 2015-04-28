#!/usr/bin/env python
import re
import json
import codecs
import subprocess


ENCODING = 'utf-8'


# MACROS defines what we search for in the LaTeX code.
LISTS = 'Persongalleri Rekvisitter Lydeffekter'.split()
SCENES = 'Sang Sketch'.split()
MACROS = [
    ('begin_list', r'\\begin{(?:%s)}' % '|'.join(LISTS)),
    ('end_list', r'\\end{(?:%s)}' % '|'.join(LISTS)),
    ('begin_scene',
     r'\\begin{(?P<scenekind>%s)}(?:\[(?P<melody>[^]]+)\])?{(?P<title>[^}]+)}'
     % '|'.join(SCENES)),
    ('end_scene', r'\\end{(?:%s)}' % '|'.join(SCENES)),
    ('item', r'\\item [^\n]+'),
    ('input', r'\\input{[^}]*}'),
]

# Regular expression built from MACROS.
# Each (k, r)-pair in MACROS becomes a capture group in the regex.
PARSER = re.compile(
    '|'.join('(?P<%s>%s)' % macro for macro in MACROS))


def parse(filename):
    """Given a filename, yield capture groups according to PARSER.

    Handles recursive input using recursion.
    """

    try:
        fp = codecs.open(filename, encoding=ENCODING)
    except FileNotFoundError:
        return

    with fp:
        for o in PARSER.finditer(fp.read()):
            key = o.lastgroup
            value = o.group(key)
            if key == 'input':
                # Here, we could use `yield from` in Py3k
                for each in parse(value[7:-1] + '.tex'):
                    yield each
            else:
                yield (key, value, o)


def parse_manus(filename):
    """Given a root filename, iterate over scenes.

    The scenes are represented as dicts with keys
    kind, title, melody, parts,
    and subkeys
    parts.Persongalleri, parts.Rekvisitter, parts.Lydeffekter.
    """
    current_list = None
    current = None
    for key, value, match in parse(filename):
        if key == 'begin_scene':
            current = {
                'kind': match.group('scenekind'),
                'title': match.group('title'),
                'melody': match.group('melody'),
                'parts': {key: [] for key in LISTS},
            }
        elif key == 'end_scene':
            yield current
        elif key == 'begin_list':
            part = value[7:-1]
            current_list = current['parts'][part]
        elif key == 'end_list':
            current_list = None
        elif key == 'item':
            if current_list is not None:
                current_list.append(value[6:])


def write_list(scenes, filename, list_name, marker):
    """Write a list of scene things to a file."""

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
                '\n\\vspace{2cm}\n\nTotal antal roller i revyen: %s'
                % count)


def main():
    scenes = list(parse_manus('manus.tex'))

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
        marker=r'\Tape',
        )

    with codecs.open('lister/sange.txt', 'w', encoding=ENCODING) as fp:
        for scene in scenes:
            if scene['kind'] == 'Sang':
                fp.write('%s\n' % scene['melody'])

    with codecs.open('lister/roller.csv', 'w', encoding=ENCODING) as fp:
        fp.write('Titel\tRolle\n')
        for scene in scenes:
            for part in scene['parts']['Persongalleri']:
                fp.write('"%s"\t"%s"\n' % (scene['title'], part))

    # Run pdflatex twice to make sure table of contents is correct
    subprocess.call(('pdflatex', 'manus.tex'))
    subprocess.call(('pdflatex', 'manus.tex'))


if __name__ == "__main__":
    main()
