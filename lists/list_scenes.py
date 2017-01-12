import os


def main():
    for d in sorted(os.listdir()):
        if d.lower() in ('sange', 'sketches', 'fisk'):
            for f in sorted(os.listdir(d), key=str.lower):
                base, ext = os.path.splitext(f)
                if ext == '.tex':
                    print("\\input{%s/%s}\\newpage" % (d, base))


if __name__ == '__main__':
    main()
