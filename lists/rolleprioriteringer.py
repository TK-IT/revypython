import re
import itertools
import collections

# Reserved symbols:
# Act titles: colon
# Part names: comma
# Reserved names:
# Act titles: "Navn"

def string_key(s):
    return s.strip().lower()

scene_names = {}
scenes = {}
part_names = {}
parts_order = []
parts = {}

with open('lister/rolleliste.txt') as fp:
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

with open('rolleprioriteringer.txt') as fp:
    revyist = None
    for i, line in enumerate(fp):
        if line.startswith('Navn:'):
            revyist = line[5:].strip()
            priority = 0
        elif ':' in line:
            scene, choices = line.split(':', 1)
            priority += 1
            scene = string_key(scene)
            choices = choices.strip()
            if choices.lower().endswith('(f)'):
                forfatter = True
                choices = choices[:-3].strip()
            else:
                forfatter = False

            choices = [string_key(part) for part in choices.split(',')]
            choices = [choice for choice in choices if choice]
            for part in choices or scenes[scene]:
                choice = Choice(scene=scene, part=part, forfatter=forfatter,
                                revyist=revyist, priority=priority)
                parts[scene, part].append(choice)
                # print('%d\t%d\t%s\t%s\t%s' %
                #       (i + 1, priority, revyist, scene_names[scene],
                #        part_names[scene, choice]))

for scene, part in parts_order:
    print('%s: %s' % (scene_names[scene], part_names[scene, part]))
    aa = sorted(parts[scene, part], key=lambda a: a.priority)
    for a in aa:
        print('%s%d %s' %
              ('(F) ' if a.forfatter else '', a.priority, a.revyist))
    if not aa:
        print("(ingen)")
    print('')
