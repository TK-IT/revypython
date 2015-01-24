"""
Convert rollefordeling.txt to rollefordeling.csv
"""

import re
import sys

r = re.compile(r'''
    ^\*(?P<title>.*)
    |^--(?P<sang>.*)
    |^-(?P<sketch>.*)
    ''', re.X | re.M)

for o in r.finditer(sys.stdin.read()):
    k = o.lastgroup
    v = o.group(k)
    if k == 'title':
        title = o.group(k)
    else:
        rolle, navn = v.rsplit(' ', 1)
        print('"%s"\t"%s"\t"Stor %s"\t"%s"'
              % (title, rolle, k, navn))
