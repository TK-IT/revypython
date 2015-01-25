

def parsetexfile(texfile):
    current_act_dict = {
        'name': '',
        'song': False,
        'melody': '',
        'songcomment': '',
        'time': 0,
        'roles': [],
        'props': [],
        'sounds': []
    }
    for line in texfile:
        #Remove trailing spaces and tabs
        striped_line = line.strip()

        if striped_line.startswith('\\begin{Sketch}'):
            #Find name in this line
            pass
        elif striped_line.startswith('\\begin{Sang}'):
            # find name and set song to True, Also find melody
            pass
        elif striped_line.startswith('\\begin{Persongalleri}'):
            # set flag that every item should go to roles
            pass
        elif striped_line.startswith('\\begin{Rekvisitter}'):
            # Set flag that every item should go to props
            pass
        elif striped_line.startswith('\\begin{Lydeffekter}'):
            # Set flag that every item should go to props
            pass
        elif striped_line.startswith('\\item '):
            # item should go in right array
            pass
        elif striped_line.startswith('\end{'):
            # set flags to false. This should work always also in spite
            # of multiply \end{ in the document.
            pass
        elif striped_line.startswith('\\tid{')
            # Find time on act
            pass
        elif striped_line.startswith{'\\bandkommentar{'}
            # Bandcomment is lines untill corresponding '}'
            # Should we set a flag again

    return current_act_dict


def parsemanus():
    pass


if __name__ == '__main__':
    parsemanus()
