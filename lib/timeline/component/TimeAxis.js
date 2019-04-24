import * as util from '../../util';
import Component from './Component';
import TimeStep from '../TimeStep';
import * as DateUtil  from '../DateUtil';
import moment from '../../module/moment';

/** A horizontal time axis */
class TimeAxis extends Component {
  /**
 * @param {{dom: Object, domProps: Object, emitter: Emitter, range: Range}} body
 * @param {Object} [options]        See TimeAxis.setOptions for the available
 *                                  options.
 * @constructor TimeAxis
 * @extends Component
 */
  constructor(body, options) {
    super();
    this.dom = {
      foreground: null,
      lines: [],
      majorTexts: [],
      minorTexts: [],
      redundant: {
        lines: [],
        majorTexts: [],
        minorTexts: []
      }
    };
    this.props = {
      range: {
        start: 0,
        end: 0,
        minimumStep: 0
      },
      lineTop: 0
    };

    this.defaultOptions = {
      orientation: {
        axis: 'bottom'
      },  // axis orientation: 'top' or 'bottom'
      showMinorLabels: true,
      showMajorLabels: true,
      substeps: {
        visible: false,
        minWidth: 8.0
      },
      maxMinorChars: 7,
      format: TimeStep.FORMAT,
      moment,
      timeAxis: null
    };
    this.options = util.extend({}, this.defaultOptions);

    this.body = body;

    // create the HTML DOM
    this._create();

    this.setOptions(options);
  }

  /**
   * Set options for the TimeAxis.
   * Parameters will be merged in current options.
   * @param {Object} options  Available options:
   *                          {string} [orientation.axis]
   *                          {boolean} [showMinorLabels]
   *                          {boolean} [showMajorLabels]
   *                          {boolean} [substeps.visible]
   *                          {number} [substeps.minWidth]
   */
  setOptions(options) {
    if (options) {
      // copy all options that we know
      util.selectiveExtend([
        'showMinorLabels',
        'showMajorLabels',
        'substeps',
        'maxMinorChars',
        'hiddenDates',
        'timeAxis',
        'moment',
        'rtl'
      ], this.options, options);

      // deep copy the format options
      util.selectiveDeepExtend(['format'], this.options, options);

      if ('orientation' in options) {
        if (typeof options.orientation === 'string') {
          this.options.orientation.axis = options.orientation;
        }
        else if (typeof options.orientation === 'object' && 'axis' in options.orientation) {
          this.options.orientation.axis = options.orientation.axis;
        }
      }

      // apply locale to moment.js
      // TODO: not so nice, this is applied globally to moment.js
      if ('locale' in options) {
        if (typeof moment.locale === 'function') {
          // moment.js 2.8.1+
          moment.locale(options.locale);
        }
        else {
          moment.lang(options.locale);
        }
      }
    }
  }

  /**
   * Create the HTML DOM for the TimeAxis
   */
  _create() {
    this.dom.foreground = document.createElement('div');
    this.dom.background = document.createElement('div');

    this.dom.foreground.className = 'timeline-time-axis timeline-foreground';
    this.dom.background.className = 'timeline-time-axis timeline-background';
  }

  /**
   * Destroy the TimeAxis
   */
  destroy() {
    // remove from DOM
    if (this.dom.foreground.parentNode) {
      this.dom.foreground.parentNode.removeChild(this.dom.foreground);
    }
    if (this.dom.background.parentNode) {
      this.dom.background.parentNode.removeChild(this.dom.background);
    }

    this.body = null;
  }

  /**
   * Repaint the component
   * @return {boolean} Returns true if the component is resized
   */
  redraw() {
    const props = this.props;
    const foreground = this.dom.foreground;
    const background = this.dom.background;

    // determine the correct parent DOM element (depending on option orientation)
    const parent = (this.options.orientation.axis == 'top') ? this.body.dom.top : this.body.dom.bottom;
    const parentChanged = (foreground.parentNode !== parent);

    // calculate character width and height
    this._calculateCharSize();

    // TODO: recalculate sizes only needed when parent is resized or options is changed
    const showMinorLabels = this.options.showMinorLabels && this.options.orientation.axis !== 'none';
    const showMajorLabels = this.options.showMajorLabels && this.options.orientation.axis !== 'none';

    // determine the width and height of the elemens for the axis
    props.minorLabelHeight = showMinorLabels ? props.minorCharHeight : 0;
    props.majorLabelHeight = showMajorLabels ? props.majorCharHeight : 0;
    props.height = props.minorLabelHeight + props.majorLabelHeight;
    props.width = foreground.offsetWidth;

    props.minorLineHeight = this.body.domProps.root.height - props.majorLabelHeight -
        (this.options.orientation.axis == 'top' ? this.body.domProps.bottom.height : this.body.domProps.top.height);
    props.minorLineWidth = 1; // TODO: really calculate width
    props.majorLineHeight = props.minorLineHeight + props.majorLabelHeight;
    props.majorLineWidth = 1; // TODO: really calculate width

    //  take foreground and background offline while updating (is almost twice as fast)
    const foregroundNextSibling = foreground.nextSibling;
    const backgroundNextSibling = background.nextSibling;
    foreground.parentNode && foreground.parentNode.removeChild(foreground);
    background.parentNode && background.parentNode.removeChild(background);

    foreground.style.height = `${this.props.height}px`;

    this._repaintLabels();

    // put DOM online again (at the same place)
    if (foregroundNextSibling) {
      parent.insertBefore(foreground, foregroundNextSibling);
    }
    else {
      parent.appendChild(foreground)
    }
    if (backgroundNextSibling) {
      this.body.dom.backgroundVertical.insertBefore(background, backgroundNextSibling);
    }
    else {
      this.body.dom.backgroundVertical.appendChild(background)
    }
    return this._isResized() || parentChanged;
  }
  
  /**
   * Repaint major and minor text labels and vertical grid lines
   * @private
   */
  _repaintLabels() {
    const orientation = this.options.orientation.axis;

    // calculate range and step (step such that we have space for 7 characters per label)
    const start = util.convert(this.body.range.start, 'Number');
    const end = util.convert(this.body.range.end, 'Number');
    const timeLabelsize = this.body.util.toTime((this.props.minorCharWidth || 10) * this.options.maxMinorChars).valueOf();
    let minimumStep = timeLabelsize - DateUtil.getHiddenDurationBefore(this.options.moment, this.body.hiddenDates, this.body.range, timeLabelsize);
    minimumStep -= this.body.util.toTime(0).valueOf();

    const step = new TimeStep(new Date(start), new Date(end), minimumStep, this.body.hiddenDates, this.options);
    step.setMoment(this.options.moment);
    if (this.options.format) {
      step.setFormat(this.options.format);
    }
    if (this.options.timeAxis) {
      step.setScale(this.options.timeAxis);
    }
    this.step = step;

    // Move all DOM elements to a "redundant" list, where they
    // can be picked for re-use, and clear the lists with lines and texts.
    // At the end of the function _repaintLabels, left over elements will be cleaned up
    const dom = this.dom;
    dom.redundant.lines = dom.lines;
    dom.redundant.majorTexts = dom.majorTexts;
    dom.redundant.minorTexts = dom.minorTexts;
    dom.lines = [];
    dom.majorTexts = [];
    dom.minorTexts = [];

    let current;
    let next;
    let x;
    let xNext;
    let isMajor;
    let showMinorGrid;
    let width = 0;
    let prevWidth;
    let line;
    let xFirstMajorLabel = undefined;
    let count = 0;
    const MAX = 1000;
    let className;

    const showSubsteps = this.options.substeps && this.options.substeps.visible;
    
    step.start();
    next = step.getCurrent();
    xNext = this.body.util.toScreen(next);
    while (step.hasNext() && count < MAX) {
      count++;

      isMajor = step.isMajor();
      className = step.getClassName();

      current = next;
      x = xNext;

      step.next();
      next = step.getCurrent();
      xNext = this.body.util.toScreen(next);

      prevWidth = width;
      width = xNext - x;
      switch (step.scale) {
        case 'week':         showMinorGrid = true; break;
        default:             showMinorGrid = (width >= prevWidth * 0.4); break; // prevent displaying of the 31th of the month on a scale of 5 days
      }

      if (this.options.showMinorLabels && showMinorGrid) {
        var label = this._repaintMinorText(x, step.getLabelMinor(current), orientation, className);
        label.style.width = `${width}px`; // set width to prevent overflow
      }

      if (isMajor && this.options.showMajorLabels) {
        // major line
        if (x > 0) {
          if (xFirstMajorLabel == undefined) {
            xFirstMajorLabel = x;
          }
          label = this._repaintMajorText(x, step.getLabelMajor(current), orientation, className);
        }
        line = this._repaintMajorLine(x, width, orientation, className);

        if (showSubsteps) {
          this._repaintSubsteps(step, current, next, x, orientation, className);
        }
      }
      else if (showMinorGrid) {
        // minor line
        line = this._repaintMinorLine(x, width, orientation, className);

        if (showSubsteps) {
          this._repaintSubsteps(step, current, next, x, orientation, className);
        }
      }
      else if (line) {
        // adjust the width of the previous grid
        line.style.width = `${parseInt (line.style.width) + width}px`;
      }
    }

    if (count === MAX && !warnedForOverflow) {
        console.log('step', {step, t: this});

        console.warn(`Something is wrong with the Timeline scale. Limited drawing of grid lines to ${MAX} lines.`);
        warnedForOverflow = true;
    }

    // create a major label on the left when needed
    if (this.options.showMajorLabels) {
      const leftTime = this.body.util.toTime(0); // upper bound estimation
      const leftText = step.getLabelMajor(leftTime);
      const widthText = leftText.length * (this.props.majorCharWidth || 10) + 10;

      if (xFirstMajorLabel == undefined || widthText < xFirstMajorLabel) {
        this._repaintMajorText(0, leftText, orientation, className);
      }
    }

    // Cleanup leftover DOM elements from the redundant list
    util.forEach(this.dom.redundant, arr => {
      while (arr.length) {
        const elem = arr.pop();
        if (elem && elem.parentNode) {
          elem.parentNode.removeChild(elem);
        }
      }
    });
  }

  /**
   * Create a minor label for the axis at position x
   * @param {number} x
   * @param {string} text
   * @param {string} orientation   "top" or "bottom" (default)
   * @param {string} className
   * @return {Element} Returns the HTML element of the created label
   * @private
   */
  _repaintMinorText(x, text, orientation, className) {
    // reuse redundant label
    let label = this.dom.redundant.minorTexts.shift();

    if (!label) {
      // create new label
      const content = document.createTextNode('');
      label = document.createElement('div');
      label.appendChild(content);
      this.dom.foreground.appendChild(label);
    }
    this.dom.minorTexts.push(label);
    label.innerHTML = text;

    label.style.top = (orientation == 'top') ? (`${this.props.majorLabelHeight}px`) : '0';

    if (this.options.rtl) {
      label.style.left = "";
      label.style.right = `${x}px`;
    } else {
      label.style.left = `${x}px`;
    }
    label.className = `timeline-text timeline-minor ${className}`;
    //label.title = title;  // TODO: this is a heavy operation

    return label;
  }

  /**
   * Create a Major label for the axis at position x
   * @param {number} x
   * @param {string} text
   * @param {string} orientation   "top" or "bottom" (default)
   * @param {string} className
   * @return {Element} Returns the HTML element of the created label
   * @private
   */
  _repaintMajorText(x, text, orientation, className) {
    // reuse redundant label
    let label = this.dom.redundant.majorTexts.shift();

    if (!label) {
      // create label
      const content = document.createElement('div');
      label = document.createElement('div');
      label.appendChild(content);
      this.dom.foreground.appendChild(label);
    }

    label.childNodes[0].innerHTML = text;
    label.className = `timeline-text timeline-major ${className}`;
    //label.title = title; // TODO: this is a heavy operation

    label.style.top = (orientation == 'top') ? '0' : (`${this.props.minorLabelHeight}px`);
    if (this.options.rtl) {
      label.style.left = "";
      label.style.right = `${x}px`;
    } else {
      label.style.left = `${x}px`;
    }

    this.dom.majorTexts.push(label);
    return label;
  }

  /** 
   * Repaint substeps, which are line separating minor lines.
   * @private
   */
  _repaintSubsteps(step, current, next, x, orientation, className) {
    const minimumSubstepWidth = this.options.substeps.minWidth;
    
    const stepDuration = next - current;
  
    let subscale;
    if (step.step > 1) {
      subscale = step.scale;
    } else {
      switch (step.scale) {
        case 'year':
          subscale = 'quarter';
          break;
        case 'quarter':
          subscale = 'month';
          break;
        case 'month':
          subscale = 'week';
          break;
        case 'week':
          subscale = 'day';
          break;
        case 'weekday': // fall-through
        case 'day':
          subscale = 'hour';
          break;
        case 'hour':
          subscale = 'minute';
          break;
        case 'minute':
          subscale = 'second';
          break;
        case 'second':
          subscale = 'millisecond';
          break;
      }
    }
  
    if (!subscale) {
      console.warn(`Could not derive subscale from step ${step}`)
      return;
    }
  
    let substepDuration = 1; // 1 is default
    let substepDurationUnit;
    switch (subscale) {
      case 'year':
        substepDurationUnit = 'years';
        // Note: logic redundant with TimeStep.setMinimumStep(). can we use that
        // code here? Or even use a TimeStep instance for substeps? We can safely
        // assume that step.scale is 'year'
        switch (step.step) {
          case 1000:
            substepDuration = 500;
            break;
          case 500:
            substepDuration = 100;
            break;
          case 100:
            substepDuration = 50;
            break;
          case 50:
            substepDuration = 10;
            break;
        }
        break;
      case 'quarter':
        substepDurationUnit = 'quarters';
        break;
      case 'month':
        substepDurationUnit = 'months';
        break;
      case 'week':
        substepDurationUnit = 'weeks';
        break;
        case 'day':
        substepDurationUnit = 'days';
        break;
      case 'hour':  
        substepDurationUnit = 'hours';
        break;
      case 'minute':
        substepDurationUnit = 'minutes';
        break;
      case 'second':
        substepDurationUnit = 'seconds';
        break;
      case 'millisecond':
        substepDurationUnit = 'milliseconds';
  
        if (stepDuration > 100) {
          substepDuration = 100;
        } else {
          substepDuration = 10;
        }
        break;
    }
  
    const subscaleDate = current.clone();
    subscaleDate.add(substepDuration, substepDurationUnit);
  
    let index = 0;
    while (subscaleDate.valueOf() < next.valueOf()) {
      const subscaleX = this.body.util.toScreen(subscaleDate);
  
      // Checks minimum width. Due to equal widths, check on first iteration
      // is sufficient.
      if (index === 0 && (subscaleX - x < minimumSubstepWidth)) {
        break;
      }
  
      this._repaintSubstepLine(subscaleX, 1, orientation, className);
  
      // Advance
      subscaleDate.add(substepDuration, substepDurationUnit);
      index++;
    }
  }

  /**
   * Create a minor line for the axis at position x
   * @param {number} x
   * @param {number} width
   * @param {string} orientation   "top" or "bottom" (default)
   * @param {string} className
   * @return {Element} Returns the created line
   * @private
   */
  _repaintMinorLine(x, width, orientation, className) {
    // reuse redundant line
    let line = this.dom.redundant.lines.shift();
    if (!line) {
      // create vertical line
      line = document.createElement('div');
      this.dom.background.appendChild(line);
    }
    this.dom.lines.push(line);

    const props = this.props;
    if (orientation == 'top') {
      line.style.top = `${props.majorLabelHeight}px`;
    }
    else {
      line.style.top = `${this.body.domProps.top.height}px`;
    }
    line.style.height = `${props.minorLineHeight}px`;
    if (this.options.rtl) {
      line.style.left = "";
      line.style.right = `${x - props.minorLineWidth / 2}px`;
      line.className = `timeline-grid timeline-vertical-rtl timeline-minor ${className}`;
    } else {
      line.style.left = `${x - props.minorLineWidth / 2}px`;
      line.className = `timeline-grid timeline-vertical timeline-minor ${className}`;
    }
    line.style.width = `${width}px`;



    return line;
  }

  /**
   * Create a Major line for the axis at position x
   * @param {number} x
   * @param {number} width
   * @param {string} orientation   "top" or "bottom" (default)
   * @param {string} className
   * @return {Element} Returns the created line
   * @private
   */
  _repaintMajorLine(x, width, orientation, className) {
    // reuse redundant line
    let line = this.dom.redundant.lines.shift();
    if (!line) {
      // create vertical line
      line = document.createElement('div');
      this.dom.background.appendChild(line);
    }
    this.dom.lines.push(line);

    const props = this.props;
    if (orientation == 'top') {
      line.style.top = '0';
    }
    else {
      line.style.top = `${this.body.domProps.top.height}px`;
    }

    if (this.options.rtl) {
      line.style.left = "";
      line.style.right = `${x - props.majorLineWidth / 2}px`;
      line.className = `timeline-grid timeline-vertical-rtl timeline-major ${className}`;
    } else {
      line.style.left = `${x - props.majorLineWidth / 2}px`;
      line.className = `timeline-grid timeline-vertical timeline-major ${className}`;
    }

    line.style.height = `${props.majorLineHeight}px`;
    line.style.width = `${width}px`;

    return line;
  }
  
  /**
   * Create a substep line for the axis at position x
   * @param {number} x
   * @param {number} width
   * @param {string} orientation   "top" or "bottom" (default)
   * @param {string} className
   * @return {Element} Returns the created line
   * @private
   */
  _repaintSubstepLine(x, width, orientation, className) {
    // reuse redundant line
    let line = this.dom.redundant.lines.shift();
    if (!line) {
      // create vertical line
      line = document.createElement('div');
      this.dom.background.appendChild(line);
    }
    this.dom.lines.push(line);
    const props = this.props;
    if (orientation == 'top') {
      line.style.top = (props.majorLabelHeight + props.minorLabelHeight) + 'px';
    }
    else {
      line.style.top = (this.body.domProps.top.height - props.minorLabelHeight) + 'px';
    }
    line.style.height = (props.minorLineHeight - props.minorLabelHeight) + 'px';
    if (this.options.rtl) {
      line.style.left = "";
      line.style.right = (x - width/2) + 'px';
      line.className = 'timeline-grid timeline-vertical-rtl timeline-substep ' + className;
    } else {
      line.style.left = (x - width/2) + 'px';
      line.className = 'timeline-grid timeline-vertical timeline-substep ' + className;
    }
    line.style.width = width + 'px'; // explicitly set width because of line reuse
    return line;
  }
  
  /**
   * Determine the size of text on the axis (both major and minor axis).
   * The size is calculated only once and then cached in this.props.
   * @private
   */
  _calculateCharSize() {
    // Note: We calculate char size with every redraw. Size may change, for
    // example when any of the timelines parents had display:none for example.

    // determine the char width and height on the minor axis
    if (!this.dom.measureCharMinor) {
      this.dom.measureCharMinor = document.createElement('DIV');
      this.dom.measureCharMinor.className = 'timeline-text timeline-minor timeline-measure';
      this.dom.measureCharMinor.style.position = 'absolute';

      this.dom.measureCharMinor.appendChild(document.createTextNode('0'));
      this.dom.foreground.appendChild(this.dom.measureCharMinor);
    }
    this.props.minorCharHeight = this.dom.measureCharMinor.clientHeight;
    this.props.minorCharWidth = this.dom.measureCharMinor.clientWidth;

    // determine the char width and height on the major axis
    if (!this.dom.measureCharMajor) {
      this.dom.measureCharMajor = document.createElement('DIV');
      this.dom.measureCharMajor.className = 'timeline-text timeline-major timeline-measure';
      this.dom.measureCharMajor.style.position = 'absolute';

      this.dom.measureCharMajor.appendChild(document.createTextNode('0'));
      this.dom.foreground.appendChild(this.dom.measureCharMajor);
    }
    this.props.majorCharHeight = this.dom.measureCharMajor.clientHeight;
    this.props.majorCharWidth = this.dom.measureCharMajor.clientWidth;
  }
}


var warnedForOverflow = false;

export default TimeAxis;
