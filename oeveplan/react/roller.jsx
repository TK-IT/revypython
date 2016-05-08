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

function Revue(actsString) {
    var lines = actsString ? actsString.split('\n') : [];
    var rows = lines.filter(
        function (s) { return !!s; }
    ).map(
        function (s) { return s.split('\t'); }
    );
    var act = null;
    var actName = null;
    this.acts = [];
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
            this.acts.push(act);
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
    for (var i = 0; i < this.acts.length; i += 1) {
        this.acts[i].kind = get_act_kind(this.acts[i]);
    }
    this.actors = unique(actors);
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

Revue.prototype.stringify = function Revue_stringify() {
    return JSON.stringify({acts: this.acts, actors: this.actors});
};

var ActsInput = React.createClass({
    getInitialState: function () {
        return {acts: '', revueString: ''};
    },
    render: function() {
        return <div>
            <textarea value={this.state.acts}
                      onChange={this.actsStringChange} />
            <textarea value={this.state.revueString} readOnly={true} />
        </div>;
    },
    actsStringChange: function (event) {
        var s = event.target.value;
        if (s !== this.state.acts) {
            var r = new Revue(s);
            this.setState({'acts': s, 'revueString': r.stringify()});
            this.props.onChange(r);
        }
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
    choiceChange: function (k) {
        this.props.onChange(k);
    },
    render: function () {
        var choices = this.props.actors.map(
            function (actor, i) {
                return {key: actor, name: actor};
            }
        );
        if (this.props.blank) {
            choices.splice(0, 0, {key: '', name: '---'});
        }
        return <Choice choices={choices} onChange={this.choiceChange}
                       value={this.props.value} />;
    }
});

var MultiActorChoice = React.createClass({
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
        choices.unshift({key: null, name: '---'});
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
        columns: React.PropTypes.arrayOf(React.PropTypes.shape({
            key: React.PropTypes.string,
            singers: React.PropTypes.bool
        })),
        revue: React.PropTypes.instanceOf(Revue)
    },
    getInitialState: function () {
        return {
            acts: {},
            others: []
        };
    },
    setAct: function (idx, act) {
        var acts = {};
        for (var i = 0; i < this.props.columns.length; i += 1) {
            var k = this.props.columns[i].key;
            var v = (k in this.state.acts) ? this.state.acts[k] : null;
            acts[k] = (idx === i) ? act : v;
        }
        console.log("Set act", idx, "to", act);
        console.log("acts:", acts);
        this.setState({'acts': acts});
        this.props.onChange(acts);
    },
    setOthers: function (others) {
        this.setState({'others': others});
    },
    getColumnPeople: function (idx) {
        if (idx === 'others') {
            return this.state.others;
        }
        var column = this.props.columns[idx];
        if (!(column.key in this.state.acts)) return [];
        var act = this.state.acts[column.key];
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
                    if (people.indexOf(actor) !== -1 && this.state.others.indexOf(actor) === -1) {
                        return {key: actor, name: '{' + actor + '}'};
                    } else {
                        return {key: actor, name: actor};
                    }
                }.bind(this)
            );
            return <MultiChoice value={this.state.others}
                                onChange={this.setOthers}
                                choices={choices} />
        }
        var column = this.props.columns[idx];
        var act = (column.key in this.state.acts) ? this.state.acts[column.key] : null;
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
            for (var k in row) {
                var v = row[k];
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
            rows.push(
                <PlannerRow columns={plannerRowColumns}
                            revue={this.props.revue}
                            usedPeople={usedPeople} key={i}
                            onChange={onChange} />);
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
                    return this.state.rowData[i][k]
                        ? acts[this.state.rowData[i][k]].name
                        : '';
                }.bind(this)));
            // csvRows[csvRows.length-1].push(
            //     this.state.rowData[i]['others'].join(', '));
        }
        var csv = csvRows.map(function (r) { return r.join('\t') + '\n'; }).join('');
        var dataURI = 'data:text/csv;base64,' + window.btoa(csv);
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
        return {revue: new Revue()};
    },
    setActs: function (revue) {
        this.setState({'revue': revue});
    },
    render: function () {
        return <div>
            <h1>Øveplan</h1>
            <p>
            1. Indlæs rollefordelingen fra regneark:
            </p>
            <ActsInput onChange={this.setActs} />
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
