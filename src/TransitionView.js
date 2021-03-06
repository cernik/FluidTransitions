import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Animated, findNodeHandle } from 'react-native';

import TransitionItem from './TransitionItem';
import { RouteDirection, NavigationDirection } from './Types';
import * as Constants from './TransitionConstants';
import { createAnimatedWrapper, createAnimated, getRotationFromStyle } from './Utils';

const uniqueBaseId: string = `tcid-${Date.now()}`;
let uuidCount: number = 0;
let zIndex = 0;

const styles = StyleSheet.create({
  transition: {
    // backgroundColor: '#0000EF22',
    // borderColor: '#FF0000',
    // borderWidth: 1,
  },
});

type TransitionProps = {
  appear: ?boolean,
  disappear: ?boolean,
  shared: ?string,
  delay: ?boolean,
  children: Array<any>,
  modifiers: ?string,
}

class Transition extends React.Component<TransitionProps> {
  static contextTypes = {
    register: PropTypes.func,
    unregister: PropTypes.func,
    route: PropTypes.string,
    getTransitionProgress: PropTypes.func,
    getDirectionForRoute: PropTypes.func,
    getDirection: PropTypes.func,
    getIndex: PropTypes.func,
    getIsPartOfSharedTransition: PropTypes.func,    
  }

  constructor(props: TransitionProps, context: any) {
    super(props, context);
    this._name = `${uniqueBaseId}-${uuidCount++}`;
    this._animatedComponent = null;    
  }

  _name: string
  _route: string
  _isMounted: boolean;
  _viewRef: any;
  _animatedComponent: any;
  _outerAnimatedComponent: any;

  componentWillMount() {
    const { register } = this.context;
    if (register) {
      this._route = this.context.route;
      register(new TransitionItem(
        this._getName(), this.context.route,
        this, this.props.shared !== undefined, this.props.appear,
        this.props.disappear, this.props.delay !== undefined,
        zIndex++,
      ));
    }
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    const { unregister } = this.context;
    if (unregister) {
      unregister(this._getName(), this._route);
    }
  }

  getNodeHandle(): number {
    return findNodeHandle(this._viewRef);
  }

  getViewRef(): any {
    return this._viewRef;
  }

  _getName(): string {
    if (this.props.shared) { return this.props.shared; }
    return this._name;
  }

  render() {
    let element = React.Children.only(this.props.children);
    if (!element) { return null; }

    if (!this._animatedComponent) { this._animatedComponent = createAnimated(); }
    if (!this._outerAnimatedComponent) { this._outerAnimatedComponent = createAnimated(); }

    const visibilityStyle = this.getVisibilityStyle();
    const key = `${this._getName()}-${this._route}`;
    
    element = React.createElement(element.type, { ...element.props, key, ref: this.setViewRef });
    return createAnimatedWrapper({
      component: element,
      nativeStyles: [visibilityStyle, styles.transition],
      nativeCached: this._outerAnimatedComponent,
      cached: this._animatedComponent,
      log: true,
      logPrefix: "TV " + this._getName() + "/" + this._route
    });
  }
  
  setViewRef = (ref: any) => {
    this._viewRef = ref;
  }

  getVisibilityStyle() {
    const { getTransitionProgress, getDirectionForRoute,
      getIndex, getDirection, getIsPartOfSharedTransition } = this.context;

    if (!getTransitionProgress || !getDirectionForRoute ||
      !getIndex || !getDirection || !getIsPartOfSharedTransition) return {};

    const progress = getTransitionProgress();
    const index = getIndex();
    const direction = getDirection();
    if (!progress || index === undefined) return { opacity: 0 };

    const routeDirection = getDirectionForRoute(this._getName(), this._route);
    if (routeDirection === RouteDirection.unknown) return { opacity: 0 };

    const inputRange = direction === NavigationDirection.forward ?
      [index - 1, index] : [index, index + 1];

    const outputRange = routeDirection === RouteDirection.to ? [0, 1] : [1, 0];

    const visibilityProgress = progress.interpolate({ inputRange, outputRange });

    if (this.props.shared && this.props.appear === undefined) {
      if (getIsPartOfSharedTransition(this._getName(), this._route)) {
        return { opacity: visibilityProgress.interpolate({
          inputRange: Constants.ORIGINAL_VIEWS_VISIBILITY_INPUT_RANGE_ANIM_OUT,
          outputRange: Constants.ORIGINAL_VIEWS_VISIBILITY_OUTPUT_RANGE_ANIM_OUT,
        }),
        };
      }
      return {};
    } else if (this.props.appear !== undefined || this.props.disappear !== undefined) {
      return { opacity: visibilityProgress.interpolate({
        inputRange: Constants.ORIGINAL_VIEWS_VISIBILITY_INPUT_RANGE_ANIM_OUT,
        outputRange: Constants.ORIGINAL_VIEWS_VISIBILITY_OUTPUT_RANGE_ANIM_OUT,
      }) };
    }
    return {};
  }
}

export default Transition;
