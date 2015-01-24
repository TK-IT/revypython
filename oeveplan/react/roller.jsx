// vim:set ft=javascript sw=4 et:
'use strict';

var ActsInput = React.createClass({
    getInitialState: function () {
        return {actsString: '', acts: []};
    },
    getActs: function (actsString) {
        var lines = actsString.split('\n');
        var rows = lines.filter(
            function (s) { return !!s; }
        ).map(
            function (s) { return s.split('\t'); }
        );
        var act = null;
        var actName = null;
        var result = [];
        for (var i = 0; i < rows.length; i += 1) {
            var row = rows[i];
            if (row[0] !== actName) {
                act = {
                    name: row[0],
                    parts: []
                };
                actName = act.name;
                result.push(act);
            }
            act.parts.push({
                name: row[1],
                kind: row[2],
                actor: row[3]
            });
        }
        return result;
    },
    render: function() {
        return <div>
            <textarea value={this.state.actsString}
                      onChange={this.actsStringChange} />
            <textarea value={JSON.stringify(this.state.acts)} readOnly={true} />
        </div>;
    },
    actsStringChange: function (event) {
        var s = event.target.value;
        if (s !== this.state.actsString) {
            var acts = this.getActs(s)
            this.setState({
                'actsString': s,
                'acts': acts
            });
            this.props.onChange(acts);
        }
    }
});

var Planner = React.createClass({
    mixins: [React.addons.LinkedStateMixin],
    getInitialState: function () {
        return {
            columns: 'Scenen,Bandet,Aflukket',
            rows: '20,20,20,20,30,30',
            cells: [],
            songFlags: [false, true, false],
            absent: ''
        };
    },
    getCell: function (i, j, def) {
        if (this.state.cells.length <= i) {
            return def;
        } else if (this.state.cells[i].length <= j) {
            return def;
        } else {
            return parseInt(this.state.cells[i][j]);
        }
    },
    render: function() {
        var acts = this.props.acts;
        var columns = this.state.columns.split(',');
        var rowKeys = (
            (this.state.rows !== '')
            ? this.state.rows.split(',').map(
                function (i) { return parseInt(i); }
            )
            : []);
        var header = [<th key='key' />];

        var songChange = function (j, b) {
            var flags = [].slice.call(this.state.songFlags);
            flags[j] = !flags[j];
            this.setState({songFlags: flags});
        };

        var absent = this.state.absent.split(',');

        for (var j = 0; j < columns.length; j += 1) {
            header.push(
                <th key={j}>
                    <input type="checkbox" onChange={songChange.bind(this, j)}
                           checked={!!this.state.songFlags[j]} />
                    {columns[j]}
                </th>
            );
        }
        header.push(<th key='conflicts'>Konflikter</th>);
        header.push(<th key='others'>Andre</th>);

        var onChange = function (ii, jj, ev) {
            var cells = [];
            for (var i = 0; i < rowKeys.length; i += 1) {
                cells.push([]);
                for (var j = 0; j < columns.length; j += 1) {
                    cells[i].push(this.getCell(i, j, null));
                }
            }
            cells[ii][jj] = parseInt(ev.target.value);
            console.log(cells);
            this.setState({'cells': cells});
        };

        var rows = [];
        for (var i = 0; i < rowKeys.length; i += 1) {
            var row = [<td key='key'>{rowKeys[i]}</td>];
            var actors = {};  // all actors that are part of this timeslot
            var timeslotActs = {};

            // Create list of actors that are part of this timeslot
            for (var j = 0; j < absent.length; j += 1) {
                actors[absent[j]] = 1;
            }
            for (var j = 0; j < columns.length; j += 1) {
                var actIndex = this.getCell(i, j, null);
                timeslotActs[actIndex] = true;
                var act = (actIndex !== null) && acts[actIndex];
                var parts = act && act.parts;
                if (parts && this.state.songFlags[j]) {
                    parts = parts.filter(
                        function (part) {
                            return part.kind.indexOf('sang') !== -1;
                        }
                    );
                }
                var actActors = parts && parts.map(
                    function (part) { return part.actor; }
                );
                if (actActors) {
                    actActors.forEach(
                        function (actor) {
                            actors[actor] = actors[actor] + 1 || 1;
                        }
                    );
                }
            }
            for (var j = 0; j < columns.length; j += 1) {
                var options = [
                    <option key='none' value={null}>---</option>
                ];
                var value = this.getCell(i, j, null);
                for (var k = 0; k < acts.length; k += 1) {
                    var parts = acts[k].parts.filter(
                        function (part) {
                            return actors[part.actor];
                        }
                    );
                    if (this.state.songFlags[j]) {
                        parts = parts.filter(
                            function (part) {
                                return part.kind.indexOf('sang') !== -1;
                            }
                        );
                    }
                    var actActors = parts.map(
                        function (part) {
                            return part.actor;
                        }
                    );
                    var text = acts[k].name;
                    if (!timeslotActs[k]) {
                        var cnt = actActors.length;
                        text = '[' + cnt + '] ' + text;
                        if (cnt > 0) {
                            text += ' (' + actActors.join(', ') + ')';
                        }
                    }
                    options.push(
                        <option key={k} value={k}>{text}</option>
                    );
                }
                row.push(
                    <td key={j}>
                    <select value={value}
                            onChange={onChange.bind(this, i, j)}>
                    {options}
                    </select>
                    </td>
                );
            }

            // Add conflicts cell
            var conflicts = [];
            for (var actor in actors) {
                if (actors[actor] > 1) {
                    conflicts.push(actor);
                }
            }
            row.push(<td key='conflicts'>{conflicts.join(', ')}</td>);
            row.push(<td key='others'>{conflicts.join(', ')}</td>);

            rows.push(<tr key={i}>{row}</tr>);
        }

        return <div>
            Steder: <input valueLink={this.linkState('columns')} />
            Tider: <input valueLink={this.linkState('rows')} />
            Afbud: <input valueLink={this.linkState('absent')} />
            <table>
            <thead>{header}</thead>
            <tbody>{rows}</tbody>
            </table>
        </div>;
    }
});

var Rollefordeling = React.createClass({
    mixins: [React.addons.LinkedStateMixin],
    getInitialState: function () {
        return {acts: []};
    },
    setActs: function (acts) {
        this.setState({'acts': acts});
    },
    render: function () {
        return <div>
            <ActsInput onChange={this.setActs} />
            <Planner acts={this.state.acts} />
        </div>
    }
});

React.render(
    <Rollefordeling />,
    document.body
);
