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
        console.log(rows);
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
    getInitialState: function () {
        return {};
    },
    renderPart: function (part) {
        return <li>{part.name} (kind {part.kind} played by {part.actor})</li>;
    },
    renderAct: function (act) {
        return <div>
            {act.name}
            <ul>
                {act.parts.map(this.renderPart)}
            </ul>
        </div>;
    },
    render: function() {
        var acts = this.props.acts.map(this.renderAct);
        return <div>
            {acts}
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
