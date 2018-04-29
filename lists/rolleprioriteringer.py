# encoding: utf8

from __future__ import unicode_literals

import re
import codecs
import argparse
import itertools
import collections

ENCODING = 'utf-8'


# Reserved symbols:
# Act titles: colon
# Part names: comma
# Reserved names:
# Act titles: "Navn"


def string_key(s):
    return s.strip().lower()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-n', '--max-priority', type=int, default=float('inf'))
    args = parser.parse_args()

    scene_names = {}
    scenes = {}
    part_names = {}
    parts_order = []
    parts = {}

    with codecs.open('lister/rolleliste.txt', encoding=ENCODING) as fp:
        for i, line in enumerate(fp):
            o = re.match(r'([^:]+): (.*)\n', line)
            if o is None:
                print(line)
                raise ValueError("Could not parse line %d" % (i + 1,))
            scene = string_key(o.group(1))
            part = string_key(o.group(2))
            scene_names[scene] = o.group(1)
            part_names[scene, part] = o.group(2)
            parts_order.append((scene, part))
            parts[scene, part] = []
            scenes.setdefault(scene, [])
            scenes[scene].append(part)

    Choice = collections.namedtuple(
        'Choice', 'scene part revyist priority forfatter')

    with codecs.open('rolleprioriteringer.txt', encoding=ENCODING) as fp:
        revyist = None
        for i, line in enumerate(fp):
            line = line.strip()
            line = line.strip('\ufeff')  # Strip byte order mark
            if not line:
                continue
            if line.startswith('Navn:'):
                revyist = line[5:].strip()
                priority = 0
                forfatter_count = 0
                continue
            if line.lower().endswith('(f)'):
                forfatter = True
                forfatter_count += 1
                if forfatter_count > 1:
                    print("%s har %s forfatterkort" %
                          (revyist, forfatter_count))
                line = line[:-3].strip()
            else:
                forfatter = False
            avoid = False
            if ':' in line:
                scene, choices = line.split(':', 1)
                scene = string_key(scene)
                choices = choices.strip()
                choices = [string_key(part) for part in choices.split(',')]
                choices = [choice for choice in choices if choice]
            else:
                scene = string_key(line)
                choices = None
            if scene not in scene_names and scene.startswith('ikke '):
                scene = scene[5:].strip()
                avoid = True
            if scene not in scene_names:
                if ':' in line:
                    print('%s: Ukendt sketch/sang %r' % (revyist, scene))
                else:
                    print('%s: Hvad betyder %r?' % (revyist, line))
                continue
            if not avoid:
                priority += 1
            if revyist is None:
                print("Ignorerer linjen %r " % (line,) +
                      "da der ikke har været noget navn endnu")
                continue

            for part in choices or scenes[scene]:
                choice = Choice(scene=scene, part=part, forfatter=forfatter,
                                revyist=revyist,
                                priority=10000 if avoid else priority)
                try:
                    parts[scene, part].append(choice)
                except KeyError:
                    print("%s: Ukendt rolle %r i %r" % (revyist, part, scene))
                # print('%d\t%d\t%s\t%s\t%s' %
                #       (i + 1, priority, revyist, scene_names[scene],
                #        part_names[scene, choice]))

    with codecs.open('lister/rolleprioriteringer.txt', 'w', encoding=ENCODING) as fp:
        for scene, part in parts_order:
            fp.write('%s: %s\n' % (scene_names[scene], part_names[scene, part]))
            aa = parts[scene, part]
            aa = filter(lambda a: a.priority <= args.max_priority or a.priority == 10000, aa)
            aa = sorted(aa, key=lambda a: a.priority)
            for a in aa:
                fp.write('%s%s %s\n' %
                         ('(F) ' if a.forfatter else '',
                          'IKKE' if a.priority == 10000 else a.priority,
                          a.revyist))
            if not aa:
                fp.write("(ingen)\n")
            fp.write('\n')


if __name__ == "__main__":
    main()
