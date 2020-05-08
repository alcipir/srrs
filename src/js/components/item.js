import { Controlled as CodeMirror } from 'react-codemirror2';
import React, { Component } from 'react';
import classnames from 'classnames';
import cx from 'classnames-es';
import moment from 'moment';
import { SrrsCreate } from '/components/lib/srrs-create';
import { Link } from 'react-router-dom';
import { ItemBody } from '/components/lib/item-body';
import { EditItem } from '/components/edit-item';
import { PathControl } from '/components/lib/path-control';
import { NextPrev } from '/components/lib/next-prev';
import { Recall } from '/components/recall';
import { NotFound } from '/components/not-found';
import { withRouter } from 'react-router';
import { Spinner } from '/components/lib/icons/icon-spinner';
import { dateToDa } from '/lib/util';
import _ from 'lodash';
import 'codemirror/mode/markdown/markdown';
const NF = withRouter(NotFound);
const PC = withRouter(SrrsCreate);

export class Item extends Component {
  constructor(props) {
    super(props);

    moment.updateLocale('en', {
      relativeTime: {
        past: function (input) {
          return input === 'just now'
            ? input
            : input + ' ago'
        },
        s: 'just now',
        future: 'in %s',
        m: '1m',
        mm: '%dm',
        h: '1h',
        hh: '%dh',
        d: '1d',
        dd: '%dd',
        M: '1 month',
        MM: '%d months',
        y: '1 year',
        yy: '%d years',
      }
    });

    this.state = {
      mode: 'view',
      title: '',
      bodyFront: '',
      bodyBack: '',
      learn: [],
      awaitingEdit: false,
      awaitingGrade: false,
      awaitingLoad: false,
      awaitingDelete: false,
      submit: false,
      ship: this.props.ship,
      stackId: this.props.stackId,
      itemId: this.props.itemId,
      stack: null,
      item: null,
      pathData: [],
      temporary: false,
      notFound: false,
    }

    if (this.props.location.state) {
      let mode = this.props.location.state.mode;
      if (mode) {
        this.state.mode = mode;
      }
    }


    this.editItem = this.editItem.bind(this);
    this.deleteItem = this.deleteItem.bind(this);
    this.titleChange = this.titleChange.bind(this);
    this.gradeItem = this.gradeItem.bind(this);
    this.setGrade = this.setGrade.bind(this);
    this.saveGrade = this.saveGrade.bind(this);
    this.toggleAdvanced = this.toggleAdvanced.bind(this);
    this.toggleShowBack = this.toggleShowBack.bind(this);

  }

  editItem() {
    this.setState({ mode: 'edit' });
  }

  gradeItem() {
    this.setState({ mode: 'grade' });
  }
  setGrade(value) {
    this.setState({ recallGrade: value });
  }
  toggleAdvanced() {
    if (this.state.mode == 'advanced') {
      this.setState({ mode: 'view' });
    } else {
      this.setState({ mode: 'advanced' });
    }
  }
  toggleShowBack() {
    if (this.state.showBack) {
      this.setState({ showBack: false });
    } else {
      this.setState({ showBack: true });
    }
  }

  saveGrade(value) {
    this.props.setSpinner(true);
    let data = {
      "answered-item": {
        stak: this.props.stackId,
        item: this.props.itemId,
        answer: value
      },
    };
    this.setState({
      awaitingGrade: {
        ship: this.state.ship,
        stackId: this.props.stackId,
        itemId: this.props.itemId,
      }
    }, () => {
      this.props.api.action("srrs", "srrs-action", data)
    });
  }

  componentWillMount() {
    let ship = this.props.ship;
    let stackId = this.props.stackId;
    let itemId = this.props.itemId;
    if (ship !== window.ship) {
      let stack = _.get(this.props, `subs["${ship}"]["${stackId}"]`, false);

      if (stack) {
        let item = _.get(stack, `items["${itemId}"]`, false);
        let learn = _.get(stack, `items["${itemId}"].learn`, false);
        let stackUrl = `/~srrs/${stack.info.owner}/${stack.info.filename}`;
        let itemUrl = `${stackUrl}/${item.content["note-id"]}`;

        this.setState({
          title: item.content.title,
          bodyFront: item.content.front,
          bodyBack: item.content.back,
          stack: stack,
          item: item,
          learn: learn,
          pathData: [
            { text: "Home", url: "/~srrs/review" },
            { text: stack.info.title, url: stackUrl },
            { text: item.title, url: itemUrl },
          ],
        });

        let read = {
          read: {
            who: ship,
            stack: stackId,
            item: itemId,
          }
        };
        this.props.api.action("srrs", "srrs-action", read);

      } else {
        this.setState({
          awaitingLoad: {
            ship: ship,
            stackId: stackId,
            itemId: itemId,
          },
          temporary: true,
        });

        this.props.setSpinner(true);

        this.props.api.bind(`/stack/${stackId}`, "PUT", ship, "srrs",
          this.handleEvent.bind(this),
          this.handleError.bind(this));
      }
    } else {
      let stack = _.get(this.props, `pubs["${stackId}"]`, false);
      let item = _.get(stack, `items["${itemId}"]`, false);
      let learn = _.get(stack, `items["${itemId}"].learn`, false);

      if (!stack || !item) {
        this.setState({ notFound: true });
        return;
      } else {
        let stackUrl = `/~srrs/${stack.info.owner}/${stack.info.filename}`;
        let itemUrl = `${stackUrl}/${item.content["note-id"]}`;

        this.setState({
          title: item.content.title,
          bodyFront: item.content.front,
          bodyBack: item.content.back,
          stack: stack,
          item: item,
          learn: learn,
          pathData: [
            { text: "Home", url: "/~srrs/review" },
            { text: stack.info.title, url: stackUrl },
            { text: item.content.title, url: itemUrl },
          ],
        });
      }
    }
  }

  handleEvent(diff) {
    if (diff.data.total) {
      let stack = diff.data.total.data;
      let item = stack.items[this.state.itemId].item;
      let stackUrl = `/~srrs/${stack.info.owner}/${stack.info.filename}`;
      let itemUrl = `${stackUrl}/${item.content["note-id"]}`;

      this.setState({
        awaitingLoad: false,
        title: item.content.title,
        bodyFront: item.content.front,
        bodyBack: item.content.back,
        stack: stack,
        item: item,
        pathData: [
          { text: "Home", url: "/~srrs/review" },
          { text: stack.info.title, url: stackUrl },
          { text: item.info.title, url: itemUrl },
        ],
      });

      this.props.setSpinner(false);

    } else if (diff.data.stack) {
      let newStack = this.state.stack;
      newStack.info = diff.data.stack.data;
      this.setState({
        stack: newStack,
      });
    } else if (diff.data.item) {
      this.setState({
        item: diff.data.item.data,
      });
    } else if (diff.data.remove) {
      // XX TODO Handle this properly
    }
  }

  handleError(err) {
    this.props.setSpinner(false);
    this.setState({ notFound: true });
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.notFound) return;

    let ship = this.props.ship;
    let stackId = this.props.stackId;
    let itemId = this.props.itemId;

    let oldItem = prevState.item;
    let oldStack = prevState.stack;


    let item;
    let stack;
    let learn;

    if (ship === window.ship) {
      stack = _.get(this.props, `pubs["${stackId}"]`, false);
      item = _.get(stack, `items["${itemId}"]`, false);
      learn = _.get(stack, `items["${itemId}"].learn`, false);
    } else {
      stack = _.get(this.props, `subs["${ship}"]["${stackId}"]`, false);
      item = _.get(stack, `items["${itemId}"]`, false);
      learn = _.get(stack, `items["${itemId}"].learn`, false);
    }

    if (this.state.learn !== learn) {
      this.state.learn = learn;
    }
    if (this.state.awaitingDelete && (item === false) && oldItem) {
      this.props.setSpinner(false);
      let redirect = `/~srrs/~${this.props.ship}/${this.props.stackId}`;
      this.props.history.push(redirect);
      return;
    }

    if (!stack || !item) {
      this.setState({ notFound: true });
      return;
    }

    if (this.state.awaitingEdit &&
      ((item.content.title != oldItem.title))) {

      let stackUrl = `/~srrs/${stack.info.owner}/${stack.info.filename}`;
      let itemUrl = `${stackUrl}/${item.content["note-id"]}`;

      this.setState({
        mode: 'view',
        title: item.content.title,
        bodyFront: item.content.front,
        bodyBack: item.content.back,
        awaitingEdit: false,
        item: item,
        pathData: [
          { text: "Home", url: "/~srrs/review" },
          { text: stack.info.title, url: stackUrl },
          { text: item.content.title, url: itemUrl },
        ],
      });

      this.props.setSpinner(false);

      let read = {
        read: {
          who: ship,
          stak: stackId,
          item: itemId,
        }
      };
      this.props.api.action("srrs", "srrs-action", read);
    }

    if (this.state.awaitingGrade) {
      let stackUrl = `/~srrs/${stack.info.owner}/${stack.info.filename}`;
      let itemUrl = `${stackUrl}/${item.content["note-id"]}`;
      let redirect = itemUrl;
      if (this.state.mode === 'review') {
        redirect = `/~srrs/review`;
      }

      this.setState({
        awaitingGrade: false,
        mode: 'view',
        item: item

      }, () => {
        this.props.api.fetchStatus(stack.info.filename, item.content["note-id"])
        this.props.history.push(redirect)
      })


    }
    if (!this.state.temporary) {
      if (oldItem != item) {
        let stackUrl = `/~srrs/${stack.info.owner}/${stack.info.filename}`;
        let itemUrl = `${stackUrl}/${item.content["note-id"]}`;

        this.setState({
          item: item,
          title: item.content.title,
          bodyFront: item.content.front,
          bodyBack: item.content.back,
          pathData: [
            { text: "Home", url: "/~srrs/review" },
            { text: stack.info.title, url: stackUrl },
            { text: item.content.title, url: itemUrl },
          ],
        });

        let read = {
          read: {
            who: ship,
            stak: stackId,
            item: itemId,
          }
        };
        this.props.api.action("srrs", "srrs-action", read);
      }

      if (oldStack != stack) {
        this.setState({ stack: stack });
      }
    }
  }

  deleteItem() {
    let del = {
      "delete-item": {
        stak: this.props.stackId,
        item: this.props.itemId,
      }
    };
    this.props.setSpinner(true);
    this.setState({
      awaitingDelete: {
        ship: this.props.ship,
        stackId: this.props.stackId,
        itemId: this.props.itemId,
      }
    }, () => {
      this.props.api.action("srrs", "srrs-action", del);
    });
  }

  titleChange(evt) {
    this.setState({ title: evt.target.value });
  }

  gradeChange(evt) {
    this.setState({ recallGrade: evt.target.value });
  }

  render() {
    const { props, state } = this;
    let adminEnabled = (this.props.ship === window.ship);

    if (this.state.notFound) {
      return (
        <NF />
      );
    } else if (this.state.awaitingLoad) {
      return null;
    } else if (this.state.awaitingEdit) {
      return null;
    } else if (this.state.mode == 'review' || this.state.mode == 'view' || this.state.mode == 'grade' || this.state.mode == 'advanced') {
      let title = this.state.item.content.title;
      let stackTitle = this.props.stackId;
      let host = this.state.stack.info.owner;
      let date = moment(this.state.item.content["date-created"]).fromNow();

      return (

        <div className="center mw6 f9 h-100"
          style={{ paddingLeft: 16, paddingRight: 16 }}>
          <div className="h-100 pt0 pt8-m pt8-l pt8-xl no-scrollbar">

            <div
              className="flex justify-between"
              style={{ marginBottom: 32 }}>
              <div className="flex-col">
                <div className="mb1">{title}</div>
                <span>
                  <span className="gray3 mr1">by</span>
                  <span className={"mono"}
                    title={host}>
                    {host}
                  </span>
                </span>
                <Link to={`/~srrs/${host}/${stackTitle}`} className="blue3 ml2">
                  {`<- ${stackTitle}`}
                </Link>

              </div>
              <div className="flex">
                <Link to={`/~srrs/${host}/${stackTitle}/new-item`} className="StackButton bg-light-green green2">
                  New Item
            </Link>
              </div>
            </div>
            <Recall
              enabled={adminEnabled}
              mode={this.state.mode}
              editItem={this.editItem}
              deleteItem={this.deleteItem}
              gradeItem={this.gradeItem}
              setGrade={this.setGrade}
              saveGrade={this.saveGrade}
              toggleAdvanced={this.toggleAdvanced}
              learn={this.state.learn}
            />

            <ItemBody
              bodyFront={this.state.item.content.front}
              bodyBack={this.state.item.content.back}
              showBack={this.state.showBack}
              toggleShowBack={this.toggleShowBack}
            />

            
          </div>
        </div>

      );

    } else if (this.state.mode == 'edit') {
      return (
        <EditItem
          {...state}
          {...props} />

      );
    }
  }
}

