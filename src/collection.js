/* eslint-disable react/no-unused-prop-types,
  react/prefer-stateless-function,
  react/forbid-prop-types
*/
import { PureComponent, createElement } from 'react';
import PropTypes from 'prop-types';
import getDisplayName from 'react-display-name';
import reduxAutoloader from './reduxAutoloader';

import { assert } from './utils';

const hashTable = {};

export const collection = (options, mapStateToProps = state => state) => {
  const name = options.name;

  assert(name, 'name is required');
  assert(typeof name === 'function' || typeof name === 'string', 'name must be a function or a string');
  assert(typeof mapStateToProps === 'function', 'selector must be a function');

  const getReducerName = typeof name === 'function' ? name : () => name;

  return (WrappedComponent) => {
    class CollectionComponent extends PureComponent {
      static propTypes = {
        $refresh: PropTypes.func.isRequired,
        $name: PropTypes.string.isRequired,
      };

      componentDidMount() {
        hashTable[this.props.$name] = this.props.$refresh;
      }

      componentWillReceiveProps(nextProps) {
        if (nextProps.$refresh !== this.props.$refresh) {
          if (this.props.$name !== nextProps.$name) {
            delete hashTable[this.props.$name];
          }

          hashTable[nextProps.$name] = nextProps.$refresh;
        }
      }

      componentWillUnmount() {
        delete hashTable[this.props.$name];
      }

      render() {
        const { $name, $refresh, ...props } = this.props; // eslint-disable-line no-unused-vars
        return createElement(WrappedComponent, props);
      }
    }

    CollectionComponent.displayName = `collection-${getDisplayName(WrappedComponent)}`;
    CollectionComponent.WrappedComponent = WrappedComponent;

    return reduxAutoloader(options, (state, props) => ({
      $name: getReducerName(props),
      $refresh: state.refresh,
      ...mapStateToProps(state),
    }))(CollectionComponent);
  };
};

const refresh = () => {
  Object.values(hashTable).forEach(loader => loader());
};

export const withCollection = (WrappedComponent) => {
  const WithCollection = props => createElement(WrappedComponent, { ...props, refresh });

  WithCollection.displayName = `withCollection-${getDisplayName(WrappedComponent)}`;

  return WithCollection;
};
