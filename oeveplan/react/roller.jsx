// vim:set ft=javascript sw=4 et:
'use strict';

function keycmp(key) {
    return function cmp(g1, g2) {
        var k1 = key(g1), k2 = key(g2);
        return (k1 < k2) ? -1 : (k1 > k2) ? 1 : 0;
    }
}

function unique(x) {
    var sorted = [].slice.call(x);
    sorted.sort();
    var k = 0;
    for (var i = 1; i < sorted.length; ++i) {
        if (sorted[k] != sorted[i]) {
            sorted[++k] = sorted[i];
        }
    }
    return sorted.slice(0, k + 1);
}

function duplicates(x) {
    var res = [].slice.call(x);
    res.sort();
    var prev = null;
    var k = 0;
    for (var i = 0; i < res.length; i += 1) {
        if (res[i] !== prev) {
            prev = res[i];
        } else {
            res[k++] = res[i];
        }
    }
    return unique(res.slice(0, k));
}

function attrgetter(k) {
    return function f(o) {
        return o[k];
    };
}

// http://ecmanaut.blogspot.dk/2006/07/encoding-decoding-utf8-in-javascript.html
function encode_utf8(s) {
    return unescape(encodeURIComponent(s));
}

function decode_utf8(s) {
    return decodeURIComponent(escape(s));
}

function parse_roles(rolesString) {
    var lines = rolesString ? rolesString.split('\n') : [];
    var rows = lines.filter(
        function (s) { return !!s; }
    ).map(
        function (s) { return s.split('\t'); }
    ).map(
        function (s) {
            if (s[2] === 'Stor' || s[2] === 'Lille')
                return [s[0], s[1], s[2] + ' ' + s[3], s[4]];
            else
                return s;
        }
    ).filter(function (s) { return s[3]; });

    if (rows.length > 0 && rows[0][0] === 'Nummer') rows.unshift();
    var act = null;
    var actName = null;
    var acts = [];
    var actorsCasing = {};
    var actors = [];
    for (var i = 0; i < rows.length; i += 1) {
        var row = rows[i];
        if (row[0] !== actName) {
            act = {
                name: row[0],
                parts: []
            };
            actName = act.name;
            acts.push(act);
        }
        var actor = row[3];
        var actorLower = actor.toLowerCase();
        if (!(actorLower in actorsCasing)) {
            if (actorLower.substring(0, 2) == 'fu' && actorLower.length == 4) {
                actor = actor.toUpperCase();
            }
            actorsCasing[actorLower] = actor;
        }
        act.parts.push({
            name: row[1],
            kind: row[2],
            actor: actorsCasing[actorLower],
            singer: (row[2].indexOf('sang') !== -1)
        });
        actors.push(row[3]);
    }
    for (var i = 0; i < acts.length; i += 1) {
        acts[i].kind = get_act_kind(acts[i]);
    }
    actors = unique(actors);
    return {"acts": acts, "actors": actors};
}

function get_act_kind(act) {
    var song = false;
    var fisk = true;
    for (var i = 0; i < act.parts.length; i += 1) {
        if (act.parts[i].singer) song = true;
        if (act.parts[i].kind.indexOf('Stor') !== -1) fisk = false;
    }
    if (song) return 'Sang';
    else if (fisk) return 'Fisk';
    else return 'Sketch';
}

var RolesInput = React.createClass({
    render: function() {
        // Use an uncontrolled textarea for simplicity
        return <div>
            <textarea onChange={this.rolesStringChange} />
        </div>;
    },
    rolesStringChange: function (event) {
        var s = event.target.value;
        var r = parse_roles(s);
        this.props.onChange(r);
    }
});

var Dropdown = React.createClass({
    componentDidMount: function () {
        this.windowClick = function (ev) {
            // If the user clicks outside our DOM parent, call onClickOutside.
            var e = ev.target;
            while (e.parentNode) {
                if (e === this.getDOMNode().parentNode) {
                    // Clicked inside a sibling of our DOM node
                    // => not an outside click.
                    return;
                }
                console.log(e);
                e = e.parentNode;
            }
            if (e === document) {
                this.props.onClickOutside();
            }
        }.bind(this);
        window.addEventListener('click', this.windowClick, false);

        this.removeClickListener = function () {
            var r = window.removeEventListener('click', this.windowClick, false);
        }.bind(this);
    },
    componentWillUnmount: function () {
        this.removeClickListener();
    },
    render: function () {
        return <div className='dropdown'>
            {this.props.children}
        </div>;
    }
});

var Choice = React.createClass({
    propTypes: {
        value: React.PropTypes.any.isRequired,
        onChange: React.PropTypes.func.isRequired,
        choices: React.PropTypes.arrayOf(React.PropTypes.shape({
            conflicts: React.PropTypes.any.isRequired,
            key: React.PropTypes.any,
            name: React.PropTypes.string
        })).isRequired
    },
    getInitialState: function () {
        return {
            open: false
        };
    },
    close: function () {
        this.setState({open: false});
    },
    onClick: function (ev) {
        ev.preventDefault();
        this.setState({open: true});
    },
    render: function () {
        var optionClick = function (k, ev) {
            ev.preventDefault();
            this.close();
            this.props.onChange(k);
        };

        var options = this.props.choices.map(
            function (c, i) {
                var classes = React.addons.classSet({
                    'choice_option': true,
                    'conflicts': c.conflicts
                });
                return <div key={c.key === null ? 'null' : c.key} className='dropdown-item'>
                    <a onClick={optionClick.bind(this, c.key)}
                       href='#' className={classes}>
                        {c.name}
                    </a>
                </div>;
            }.bind(this)
        );
        var children = [
            <a href="#" key='link' onClick={this.onClick}>
                {this.props.value}
            </a>
        ];
        if (this.state.open) {
            children.push(
                <Dropdown key='dropdown'
                          onClickOutside={this.close}>
                    {options}
                </Dropdown>
            );
        }
        var classes = React.addons.classSet({
            'choices': true,
            'choices-active': this.state.open
        });
        return <div className={classes}>
            {children}
        </div>;
    }
});

var MultiChoice = React.createClass({
    propTypes: {
        value: React.PropTypes.array.isRequired,
        onChange: React.PropTypes.func.isRequired,
        choices: React.PropTypes.arrayOf(React.PropTypes.shape({
            //conflicts: React.PropTypes.any.isRequired,
            key: React.PropTypes.any,
            name: React.PropTypes.string
        })).isRequired
    },
    getInitialState: function () {
        return {
            open: false,
            selected: []
        };
    },
    close: function () {
        var chosen = [];
        for (var i = 0; i < this.state.selected.length; ++i) {
            if (this.state.selected[i]) {
                chosen.push(this.props.choices[i].key);
            }
        }
        this.props.onChange(chosen);
        this.setState({open: false});
    },
    onClick: function (ev) {
        ev.preventDefault();
        var selected = this.props.choices.map(
            function (c, i) {
                return this.props.value.indexOf(c.key) !== -1;
            }.bind(this)
        );
        this.setState({open: true, selected: selected});
    },
    render: function () {
        var optionClick = function (k, ev) {
            ev.preventDefault();
            this.close();
            this.props.onChange(k);
        };

        var onChange = function (i) {
            var sel = this.state.selected.slice();
            sel[i] = !sel[i];
            this.setState({selected: sel});
        }

        var options = this.props.choices.map(
            function (c, i) {
                return <div key={c.key} className='dropdown-item'>
                    <label>
                        <input type="checkbox"
                               onChange={onChange.bind(this, i)}
                               checked={this.state.selected[i]} />
                        {' '}
                        {c.name}
                    </label>
                </div>;
            }.bind(this)
        );
        var valueString = this.props.value.join(', ');
        if (!valueString) {
            valueString = '---';
        }
        var children = [
            <a href="#" key='link' onClick={this.onClick}>
                {valueString}
            </a>
        ];
        if (this.state.open) {
            children.push(
                <Dropdown key='dropdown'
                          onClickOutside={this.close}>
                    {options}
                </Dropdown>
            );
        }
        var classes = React.addons.classSet({
            'choices': true,
            'choices-active': this.state.open
        });
        return <div className={classes}>
            {children}
        </div>;
    }
});

var ActorChoice = React.createClass({
    propTypes: {
        value: React.PropTypes.string.isRequired,
        onChange: React.PropTypes.func.isRequired,
        actors: React.PropTypes.arrayOf(React.PropTypes.string).isRequired,
        blank: React.PropTypes.bool
    },
    choiceChange: function (k) {
        this.props.onChange(k);
    },
    render: function () {
        var choices = this.props.actors.map(
            function (actor, i) {
                return {key: actor, name: actor, conflicts: 0};
            }
        );
        if (this.props.blank) {
            choices.splice(0, 0, {key: '', name: '---', conflicts: 0});
        }
        return <Choice choices={choices} onChange={this.choiceChange}
                       value={this.props.value} />;
    }
});

var MultiActorChoice = React.createClass({
    propTypes: {
        value: React.PropTypes.array.isRequired,
        onChange: React.PropTypes.func.isRequired,
        actors: React.PropTypes.arrayOf(React.PropTypes.string).isRequired
    },
    choiceChange: function (k) {
        this.props.onChange(k);
    },
    render: function () {
        var choices = this.props.actors.map(
            function (actor, i) {
                return {key: actor, name: actor};
            }
        );
        return <MultiChoice
            choices={choices}
            onChange={this.choiceChange}
            value={this.props.value} />;
    }
});

var SpecificAct = React.createClass({
    propTypes: {
        singers: React.PropTypes.bool.isRequired,
        people: React.PropTypes.arrayOf(React.PropTypes.string).isRequired,
        revue: React.PropTypes.shape({
            acts: React.PropTypes.array.isRequired
        }).isRequired,
        value: React.PropTypes.string,
        onChange: React.PropTypes.func.isRequired
    },
    render: function () {
        function act_to_choice(act, idx) {
            var conflicts = [];
            for (var j = 0; j < act.parts.length; j += 1) {
                var part = act.parts[j];
                if (!this.props.singers || part.singer) {
                    if (this.props.people.indexOf(part.actor) !== -1) {
                        conflicts.push(part.actor);
                    }
                }
            }
            var label = '[' + conflicts.length + '] ' + act.name;
            if (conflicts.length > 0) {
                conflicts.sort();
                label += ' (' + conflicts.join(', ') + ')';
            }

            // The `key` here is what ends up in PlannerRow.state.acts
            return {
                key: idx,
                original_name: act.name,
                name: label,
                'conflicts': conflicts.length
            };
        }
        var choices = this.props.revue.acts.map(act_to_choice.bind(this));
        function key(c) {
            return c.original_name;
        }
        choices.sort(keycmp(key));
        choices.unshift({key: null, name: '---', conflicts: 0});
        console.log("The value is", this.props.value);
        var value = (this.props.value === null) ? '---'
            : this.props.revue.acts[this.props.value].name;
        return <Choice value={value}
                       choices={choices}
                       onChange={this.props.onChange} />;
    }
});

var PlannerRow = React.createClass({
    propTypes: {
        value: React.PropTypes.shape({
            columns: React.PropTypes.object.isRequired,
            others: React.PropTypes.array.isRequired
        }).isRequired,
        columns: React.PropTypes.arrayOf(React.PropTypes.shape({
            key: React.PropTypes.string,
            singers: React.PropTypes.bool
        })).isRequired,
        revue: React.PropTypes.shape({
            acts: React.PropTypes.array.isRequired,
            actors: React.PropTypes.array.isRequired
        }).isRequired,
        onChange: React.PropTypes.func.isRequired,
        usedPeople: React.PropTypes.array.isRequired
    },
    setAct: function (idx, act) {
        var oldColumns = this.props.value.columns;
        var columns = {};
        for (var i = 0; i < this.props.columns.length; i += 1) {
            var k = this.props.columns[i].key;
            if (idx === i) columns[k] = act;
            else if (k in oldColumns) columns[k] = oldColumns[k];
        }
        this.props.onChange({"columns": columns, "others": this.props.value.others});
    },
    setOthers: function (others) {
        this.props.onChange({"columns": this.props.value.columns, "others": others});
    },
    getColumnPeople: function (idx) {
        if (idx === 'others') {
            return this.props.value.others;
        }
        var column = this.props.columns[idx];
        if (!(column.key in this.props.value.columns)) return [];
        var act = this.props.value.columns[column.key];
        if (act === null) return [];
        var parts = this.props.revue.acts[act].parts;
        if (column.singers) {
            parts = parts && parts.filter(attrgetter('singer'));
        }
        console.log("Parts is", parts);
        var actors = parts && parts.map(attrgetter('actor'));
        console.log("Actors", actors);
        return actors || [];
    },
    renderColumn: function (idx, people) {
        if (idx === 'others') {
            var choices = this.props.revue.actors.map(
                function (actor, i) {
                    if (people.indexOf(actor) !== -1 && this.props.value.others.indexOf(actor) === -1) {
                        return {key: actor, name: '{' + actor + '}'};
                    } else {
                        return {key: actor, name: actor};
                    }
                }.bind(this)
            );
            return <MultiChoice value={this.props.value.others}
                                onChange={this.setOthers}
                                choices={choices} />
        }
        var column = this.props.columns[idx];
        var act = (column.key in this.props.value.columns) ? this.props.value.columns[column.key] : null;
        return <SpecificAct people={people} revue={this.props.revue}
                            onChange={this.setAct.bind(this, idx)}
                            singers={column.singers}
                            value={act} />
    },
    render: function () {
        var peopleSets = [];
        peopleSets.push(this.props.usedPeople);
        for (var i = 0; i < this.props.columns.length; i += 1) {
            peopleSets.push(this.getColumnPeople(i));
        }
        peopleSets.push(this.getColumnPeople('others'));
        var people = [].concat.apply([], peopleSets);

        var columns = [];
        for (var i = 0; i < this.props.columns.length; i += 1) {
            columns.push(this.renderColumn(i, people));
        }
        columns.push(this.renderColumn('others', people));
        columns.push(duplicates(people).join(', '));

        var cells = columns.map(
            function (o, i) {
                return <td key={i}>{o}</td>;
            }
        );
        return <tr>{cells}</tr>;
    }
});

var Planner = React.createClass({
    mixins: [React.addons.LinkedStateMixin],
    getInitialState: function () {
        return {
            columns: 'Scenen,I aflukket,Bandet (d01)',
            rows: 20,
            songFlags: [false, false, true],
            absent: [],
            director: '',
            rowData: []
        };
    },
    getAllActors: function () {
        var actors = [];
        for (var i = 0; i < this.props.acts.length; i += 1) {
            var act = this.props.acts[i];
            for (var j = 0; j < act.parts.length; j += 1) {
                var part = act.parts[j];
                if (actors.indexOf(part.actor) === -1) {
                    actors.push(part.actor);
                }
            }
        }
        return actors;
    },
    setAbsent: function (a) {
        this.setState({absent: a});
    },
    setDirector: function (d) {
        this.setState({director: d});
    },
    rowChange: function (i, d) {
        var rowData = [].slice.call(this.state.rowData);
        rowData[i] = d;
        this.setState({'rowData': rowData});
    },
    getActCounts: function () {
        var counts = [];
        for (var i = 0; i < this.state.rowData.length; ++i) {
            var row = this.state.rowData[i];
            if (!row) continue;
            for (var k in row.columns) {
                var v = row.columns[k];
                if (v !== null) {
                    counts[v] = (counts[v] || 0) + 1;
                }
            }
        }
        var actsByKind = {};
        for (var i = 0; i < this.props.acts.length; ++i) {
            actsByKind[this.props.acts[i].kind] = [];
        }
        for (var i = 0; i < this.props.acts.length; ++i) {
            var a = this.props.acts[i];
            var count = counts[i] || 0;
            actsByKind[a.kind].push({'act': a, 'count': count});
        }
        return actsByKind;
    },
    render: function() {
        var acts = this.props.acts;
        var columns = this.state.columns.split(',');
        var header = [];
        var allActors = this.getAllActors();

        var songChange = function (j, b) {
            var flags = [].slice.call(this.state.songFlags);
            flags[j] = !flags[j];
            this.setState({songFlags: flags});
        };

        var absent = this.state.absent;

        for (var j = 0; j < columns.length; j += 1) {
            header.push(
                <th key={j}>
                    <input type="checkbox" onChange={songChange.bind(this, j)}
                           checked={!!this.state.songFlags[j]} />
                    {columns[j]}
                </th>
            );
        }
        header.push(<th key='others'>Andre</th>);
        header.push(<th key='conflicts'>Konflikter</th>);
        var cols = header.map(function (o) { return <col width="*" key={o.key} />; });
        console.log(cols);

        var plannerRowColumns = columns.map(
            function (name, j) {
                return {key: name, singers: this.state.songFlags[j]};
            }.bind(this)
        );
        var usedPeople = this.state.absent.concat([this.state.director]);
        var rows = [];
        for (var i = 0; i < this.state.rows; i += 1) {
            var onChange = this.rowChange.bind(this, i);
            var v = this.state.rowData[i] ? this.state.rowData[i] :
                {columns: {}, others: []};
            rows.push(
                <PlannerRow columns={plannerRowColumns}
                            revue={this.props.revue}
                            usedPeople={usedPeople} key={i}
                            onChange={onChange} value={v} />);
        }

        var actCountsByKind = this.getActCounts();
        var actCounts = [];
        for (var k in actCountsByKind) {
            actCountsByKind[k].sort(keycmp(function (a) {
                return a.act.name;
            }));
            var c = actCountsByKind[k].map(function (a) {
                return <li>{a.count}: {a.act.name}</li>;
            });
            actCounts.push(<ul>{c}</ul>);
        }

        var csvRows = [];
        csvRows.push(columns);
        for (var i = 0; i < rows.length; ++i) {
            if (!this.state.rowData[i]) continue;
            csvRows.push(
                columns.map(function (k) {
                    return this.state.rowData[i].columns[k]
                        ? acts[this.state.rowData[i].columns[k]].name
                        : '';
                }.bind(this)));
            csvRows[csvRows.length-1].push(
                this.state.rowData[i].others.join(', '));
        }
        var csv = csvRows.map(function (r) { return r.join('\t') + '\n'; }).join('');
        var dataURI = 'data:text/csv;base64,' + window.btoa(encode_utf8(csv));
        var download = <a href={dataURI} download={'oeveplan.csv'}>Download CSV</a>;

        return <div>
            Steder: <input valueLink={this.linkState('columns')} />
            <div>
                Afbud:
                <MultiActorChoice actors={this.props.revue.actors}
                                  value={this.state.absent}
                                  onChange={this.setAbsent} />
            </div>
            <div>
                Destruktør:
                <ActorChoice actors={this.props.revue.actors}
                             value={this.state.director || '---'}
                             blank={true}
                             onChange={this.setDirector} />
            </div>
            <table className='planner'>
            <colgroup>{cols}</colgroup>
            <thead><tr>{header}</tr></thead>
            <tbody>{rows}</tbody>
            </table>
            <div>{download}</div>
            <div>
            Revynumre:
            </div>
            {actCounts}
        </div>;
    }
});

var Main = React.createClass({
    mixins: [React.addons.LinkedStateMixin],
    getInitialState: function () {
        return {revue: parse_roles('')};
    },
    setRoles: function (revue) {
        this.setState({'revue': revue});
    },
    render: function () {
        return <div>
            <h1>Øveplan</h1>
            <p>
            1. Indlæs rollefordelingen fra regneark:
            </p>
            <RolesInput onChange={this.setRoles} />
            <p>
            2. Konstruér øveplan:
            </p>
            <Planner revue={this.state.revue} acts={this.state.revue.acts} />
        </div>
    }
});

React.render(
    <Main />,
    document.body
);
