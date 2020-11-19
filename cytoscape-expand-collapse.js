(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeExpandCollapse = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var boundingBoxUtilities = {
  equalBoundingBoxes: function(bb1, bb2){
      return bb1.x1 == bb2.x1 && bb1.x2 == bb2.x2 && bb1.y1 == bb2.y1 && bb1.y2 == bb2.y2;
  },
  getUnion: function(bb1, bb2){
      var union = {
      x1: Math.min(bb1.x1, bb2.x1),
      x2: Math.max(bb1.x2, bb2.x2),
      y1: Math.min(bb1.y1, bb2.y1),
      y2: Math.max(bb1.y2, bb2.y2),
    };

    union.w = union.x2 - union.x1;
    union.h = union.y2 - union.y1;

    return union;
  }
};

module.exports = boundingBoxUtilities;
},{}],2:[function(_dereq_,module,exports){
var debounce = _dereq_('./debounce');
var debounce2 = _dereq_('./debounce2');

module.exports = function (params, cy, api) {
  var elementUtilities;
  var fn = params;
  const CUE_POS_UPDATE_DELAY = 100;
  var nodeWithRenderedCue;

  const getData = function () {
    var scratch = cy.scratch('_cyExpandCollapse');
    return scratch && scratch.cueUtilities;
  };

  const setData = function (data) {
    var scratch = cy.scratch('_cyExpandCollapse');
    if (scratch == null) {
      scratch = {};
    }

    scratch.cueUtilities = data;
    cy.scratch('_cyExpandCollapse', scratch);
  };

  var functions = {
    init: function () {
      var $canvas = document.createElement('canvas');
      $canvas.classList.add("expand-collapse-canvas");
      var $container = cy.container();
      var ctx = $canvas.getContext('2d');
      $container.append($canvas);

      elementUtilities = _dereq_('./elementUtilities')(cy);

      var offset = function (elt) {
        var rect = elt.getBoundingClientRect();

        return {
          top: rect.top + document.documentElement.scrollTop,
          left: rect.left + document.documentElement.scrollLeft
        }
      }

      var _sizeCanvas = debounce(function () {
        $canvas.height = cy.container().offsetHeight;
        $canvas.width = cy.container().offsetWidth;
        $canvas.style.position = 'absolute';
        $canvas.style.top = 0;
        $canvas.style.left = 0;
        $canvas.style.zIndex = options().zIndex;

        setTimeout(function () {
          var canvasBb = offset($canvas);
          var containerBb = offset($container);
          $canvas.style.top = -(canvasBb.top - containerBb.top);
          $canvas.style.left = -(canvasBb.left - containerBb.left);

          // refresh the cues on canvas resize
          if (cy) {
            clearDraws(true);
          }
        }, 0);

      }, 250);

      function sizeCanvas() {
        _sizeCanvas();
      }

      sizeCanvas();

      var data = {};

      // if there are events field in data unbind them here
      // to prevent binding the same event multiple times
      // if (!data.hasEventFields) {
      //   functions['unbind'].apply( $container );
      // }

      function options() {
        return cy.scratch('_cyExpandCollapse').options;
      }

      function clearDraws() {
        var w = cy.width();
        var h = cy.height();

        ctx.clearRect(0, 0, w, h);
        nodeWithRenderedCue = null;
      }

      function drawExpandCollapseCue(node) {
        var children = node.children();
        var collapsedChildren = node.data('collapsedChildren');
        var hasChildren = children != null && children != undefined && children.length > 0;
        // If this is a simple node with no collapsed children return directly
        if (!hasChildren && !collapsedChildren) {
          return;
        }

        var isCollapsed = node.hasClass('cy-expand-collapse-collapsed-node');

        //Draw expand-collapse rectangles
        var rectSize = options().expandCollapseCueSize;
        var lineSize = options().expandCollapseCueLineSize;

        var cueCenter;

        if (options().expandCollapseCuePosition === 'top-left') {
          var offset = 1;
          var size = cy.zoom() < 1 ? rectSize / (2 * cy.zoom()) : rectSize / 2;
          var nodeBorderWid = parseFloat(node.css('border-width'));
          var x = node.position('x') - node.width() / 2 - parseFloat(node.css('padding-left'))
            + nodeBorderWid + size + offset;
          var y = node.position('y') - node.height() / 2 - parseFloat(node.css('padding-top'))
            + nodeBorderWid + size + offset;

          cueCenter = { x: x, y: y };
        } else {
          var option = options().expandCollapseCuePosition;
          cueCenter = typeof option === 'function' ? option.call(this, node) : option;
        }

        var expandcollapseCenter = elementUtilities.convertToRenderedPosition(cueCenter);

        // convert to rendered sizes
        rectSize = Math.max(rectSize, rectSize * cy.zoom());
        lineSize = Math.max(lineSize, lineSize * cy.zoom());
        var diff = (rectSize - lineSize) / 2;

        var expandcollapseCenterX = expandcollapseCenter.x;
        var expandcollapseCenterY = expandcollapseCenter.y;

        var expandcollapseStartX = expandcollapseCenterX - rectSize / 2;
        var expandcollapseStartY = expandcollapseCenterY - rectSize / 2;
        var expandcollapseRectSize = rectSize;

        // Draw expand/collapse cue if specified use an image else render it in the default way
        if (isCollapsed && options().expandCueImage) {
          drawImg(options().expandCueImage, expandcollapseStartX, expandcollapseStartY, rectSize, rectSize);
        }
        else if (!isCollapsed && options().collapseCueImage) {
          drawImg(options().collapseCueImage, expandcollapseStartX, expandcollapseStartY, rectSize, rectSize);
        }
        else {
          var oldFillStyle = ctx.fillStyle;
          var oldWidth = ctx.lineWidth;
          var oldStrokeStyle = ctx.strokeStyle;

          ctx.fillStyle = "black";
          ctx.strokeStyle = "black";

          ctx.ellipse(expandcollapseCenterX, expandcollapseCenterY, rectSize / 2, rectSize / 2, 0, 0, 2 * Math.PI);
          ctx.fill();

          ctx.beginPath();

          ctx.strokeStyle = "white";
          ctx.lineWidth = Math.max(2.6, 2.6 * cy.zoom());

          ctx.moveTo(expandcollapseStartX + diff, expandcollapseStartY + rectSize / 2);
          ctx.lineTo(expandcollapseStartX + lineSize + diff, expandcollapseStartY + rectSize / 2);

          if (isCollapsed) {
            ctx.moveTo(expandcollapseStartX + rectSize / 2, expandcollapseStartY + diff);
            ctx.lineTo(expandcollapseStartX + rectSize / 2, expandcollapseStartY + lineSize + diff);
          }

          ctx.closePath();
          ctx.stroke();

          ctx.strokeStyle = oldStrokeStyle;
          ctx.fillStyle = oldFillStyle;
          ctx.lineWidth = oldWidth;
        }

        node._private.data.expandcollapseRenderedStartX = expandcollapseStartX;
        node._private.data.expandcollapseRenderedStartY = expandcollapseStartY;
        node._private.data.expandcollapseRenderedCueSize = expandcollapseRectSize;

        nodeWithRenderedCue = node;
      }

      function drawImg(imgSrc, x, y, w, h) {
        var img = new Image(w, h);
        img.src = imgSrc;
        img.onload = () => {
          ctx.drawImage(img, x, y, w, h);
        };
      }

      cy.on('resize', data.eCyResize = function () {
        sizeCanvas();
      });

      cy.on('expandcollapse.clearvisualcue', function () {
        if (nodeWithRenderedCue) {
          clearDraws();
        }
      });

      var oldMousePos = null, currMousePos = null;
      cy.on('mousedown', data.eMouseDown = function (e) {
        oldMousePos = e.renderedPosition || e.cyRenderedPosition
      });

      cy.on('mouseup', data.eMouseUp = function (e) {
        currMousePos = e.renderedPosition || e.cyRenderedPosition
      });

      cy.on('remove', 'node', data.eRemove = function () {
        clearDraws();
      });

      var ur;
      cy.on('select unselect', data.eSelect = function () {
        if (nodeWithRenderedCue) {
          clearDraws();
        }
        var isOnly1Selected = cy.$(':selected').length == 1;
        var isOnly1SelectedCompundNode = cy.nodes(':parent').filter(':selected').length == 1 && isOnly1Selected;
        var isOnly1SelectedCollapsedNode = cy.nodes('.cy-expand-collapse-collapsed-node').filter(':selected').length == 1 && isOnly1Selected;
        if (isOnly1SelectedCollapsedNode || isOnly1SelectedCompundNode) {
          drawExpandCollapseCue(cy.nodes(':selected')[0]);
        }
      });

      cy.on('tap', data.eTap = function (event) {
        var node = nodeWithRenderedCue;
        if (!node) {
          return;
        }
        var expandcollapseRenderedStartX = node.data('expandcollapseRenderedStartX');
        var expandcollapseRenderedStartY = node.data('expandcollapseRenderedStartY');
        var expandcollapseRenderedRectSize = node.data('expandcollapseRenderedCueSize');
        var expandcollapseRenderedEndX = expandcollapseRenderedStartX + expandcollapseRenderedRectSize;
        var expandcollapseRenderedEndY = expandcollapseRenderedStartY + expandcollapseRenderedRectSize;

        var cyRenderedPos = event.renderedPosition || event.cyRenderedPosition;
        var cyRenderedPosX = cyRenderedPos.x;
        var cyRenderedPosY = cyRenderedPos.y;
        var opts = options();
        var factor = (opts.expandCollapseCueSensitivity - 1) / 2;

        if ((Math.abs(oldMousePos.x - currMousePos.x) < 5 && Math.abs(oldMousePos.y - currMousePos.y) < 5)
          && cyRenderedPosX >= expandcollapseRenderedStartX - expandcollapseRenderedRectSize * factor
          && cyRenderedPosX <= expandcollapseRenderedEndX + expandcollapseRenderedRectSize * factor
          && cyRenderedPosY >= expandcollapseRenderedStartY - expandcollapseRenderedRectSize * factor
          && cyRenderedPosY <= expandcollapseRenderedEndY + expandcollapseRenderedRectSize * factor) {
          if (opts.undoable && !ur) {
            ur = cy.undoRedo({ defaultActions: false });
          }

          if (api.isCollapsible(node)) {
            clearDraws();
            if (opts.undoable) {
              ur.do("collapse", {
                nodes: node,
                options: opts
              });
            }
            else {
              api.collapse(node, opts);
            }
          }
          else if (api.isExpandable(node)) {
            clearDraws();
            if (opts.undoable) {
              ur.do("expand", { nodes: node, options: opts });
            }
            else {
              api.expand(node, opts);
            }
          }
          if (node.selectable()) {
            node.unselectify();
            cy.scratch('_cyExpandCollapse').selectableChanged = true;
          }
        }
      });

      cy.on('position', 'node', data.ePosition = debounce2(data.eSelect, CUE_POS_UPDATE_DELAY, clearDraws));

      cy.on('pan zoom', data.ePosition);

      cy.on('expandcollapse.afterexpand expandcollapse.aftercollapse', 'node', data.eAfterExpandCollapse = function () {
        var delay = 50 + params.animate ? params.animationDuration : 0;
        setTimeout(() => {
          if (this.selected()) {
            drawExpandCollapseCue(this);
          }
        }, delay);
      });

      // write options to data
      data.hasEventFields = true;
      setData(data);
    },
    unbind: function () {
      // var $container = this;
      var data = getData();

      if (!data.hasEventFields) {
        console.log('events to unbind does not exist');
        return;
      }

      cy.trigger('expandcollapse.clearvisualcue');

      cy.off('mousedown', 'node', data.eMouseDown)
        .off('mouseup', 'node', data.eMouseUp)
        .off('remove', 'node', data.eRemove)
        .off('tap', 'node', data.eTap)
        .off('add', 'node', data.eAdd)
        .off('position', 'node', data.ePosition)
        .off('pan zoom', data.ePosition)
        .off('select unselect', data.eSelect)
        .off('expandcollapse.afterexpand expandcollapse.aftercollapse', 'node', data.eAfterExpandCollapse)
        .off('free', 'node', data.eFree)
        .off('resize', data.eCyResize);
    },
    rebind: function () {
      var data = getData();

      if (!data.hasEventFields) {
        console.log('events to rebind does not exist');
        return;
      }

      cy.on('mousedown', 'node', data.eMouseDown)
        .on('mouseup', 'node', data.eMouseUp)
        .on('remove', 'node', data.eRemove)
        .on('tap', 'node', data.eTap)
        .on('add', 'node', data.eAdd)
        .on('position', 'node', data.ePosition)
        .on('pan zoom', data.ePosition)
        .on('select unselect', data.eSelect)
        .on('expandcollapse.afterexpand expandcollapse.aftercollapse', 'node', data.eAfterExpandCollapse)
        .on('free', 'node', data.eFree)
        .on('resize', data.eCyResize);
    }
  };

  if (functions[fn]) {
    return functions[fn].apply(cy.container(), Array.prototype.slice.call(arguments, 1));
  } else if (typeof fn == 'object' || !fn) {
    return functions.init.apply(cy.container(), arguments);
  }
  throw new Error('No such function `' + fn + '` for cytoscape.js-expand-collapse');

};

},{"./debounce":3,"./debounce2":4,"./elementUtilities":5}],3:[function(_dereq_,module,exports){
var debounce = (function () {
  /**
   * lodash 3.1.1 (Custom Build) <https://lodash.com/>
   * Build: `lodash modern modularize exports="npm" -o ./`
   * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   * Available under MIT license <https://lodash.com/license>
   */
  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /* Native method references for those with the same name as other `lodash` methods. */
  var nativeMax = Math.max,
          nativeNow = Date.now;

  /**
   * Gets the number of milliseconds that have elapsed since the Unix epoch
   * (1 January 1970 00:00:00 UTC).
   *
   * @static
   * @memberOf _
   * @category Date
   * @example
   *
   * _.defer(function(stamp) {
   *   console.log(_.now() - stamp);
   * }, _.now());
   * // => logs the number of milliseconds it took for the deferred function to be invoked
   */
  var now = nativeNow || function () {
    return new Date().getTime();
  };

  /**
   * Creates a debounced function that delays invoking `func` until after `wait`
   * milliseconds have elapsed since the last time the debounced function was
   * invoked. The debounced function comes with a `cancel` method to cancel
   * delayed invocations. Provide an options object to indicate that `func`
   * should be invoked on the leading and/or trailing edge of the `wait` timeout.
   * Subsequent calls to the debounced function return the result of the last
   * `func` invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
   * on the trailing edge of the timeout only if the the debounced function is
   * invoked more than once during the `wait` timeout.
   *
   * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
   * for details over the differences between `_.debounce` and `_.throttle`.
   *
   * @static
   * @memberOf _
   * @category Function
   * @param {Function} func The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Object} [options] The options object.
   * @param {boolean} [options.leading=false] Specify invoking on the leading
   *  edge of the timeout.
   * @param {number} [options.maxWait] The maximum time `func` is allowed to be
   *  delayed before it's invoked.
   * @param {boolean} [options.trailing=true] Specify invoking on the trailing
   *  edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * // avoid costly calculations while the window size is in flux
   * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
   *
   * // invoke `sendMail` when the click event is fired, debouncing subsequent calls
   * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
   *   'leading': true,
   *   'trailing': false
   * }));
   *
   * // ensure `batchLog` is invoked once after 1 second of debounced calls
   * var source = new EventSource('/stream');
   * jQuery(source).on('message', _.debounce(batchLog, 250, {
   *   'maxWait': 1000
   * }));
   *
   * // cancel a debounced call
   * var todoChanges = _.debounce(batchLog, 1000);
   * Object.observe(models.todo, todoChanges);
   *
   * Object.observe(models, function(changes) {
   *   if (_.find(changes, { 'user': 'todo', 'type': 'delete'})) {
   *     todoChanges.cancel();
   *   }
   * }, ['delete']);
   *
   * // ...at some point `models.todo` is changed
   * models.todo.completed = true;
   *
   * // ...before 1 second has passed `models.todo` is deleted
   * // which cancels the debounced `todoChanges` call
   * delete models.todo;
   */
  function debounce(func, wait, options) {
    var args,
            maxTimeoutId,
            result,
            stamp,
            thisArg,
            timeoutId,
            trailingCall,
            lastCalled = 0,
            maxWait = false,
            trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    wait = wait < 0 ? 0 : (+wait || 0);
    if (options === true) {
      var leading = true;
      trailing = false;
    } else if (isObject(options)) {
      leading = !!options.leading;
      maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }

    function cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
      }
      lastCalled = 0;
      maxTimeoutId = timeoutId = trailingCall = undefined;
    }

    function complete(isCalled, id) {
      if (id) {
        clearTimeout(id);
      }
      maxTimeoutId = timeoutId = trailingCall = undefined;
      if (isCalled) {
        lastCalled = now();
        result = func.apply(thisArg, args);
        if (!timeoutId && !maxTimeoutId) {
          args = thisArg = undefined;
        }
      }
    }

    function delayed() {
      var remaining = wait - (now() - stamp);
      if (remaining <= 0 || remaining > wait) {
        complete(trailingCall, maxTimeoutId);
      } else {
        timeoutId = setTimeout(delayed, remaining);
      }
    }

    function maxDelayed() {
      complete(trailing, timeoutId);
    }

    function debounced() {
      args = arguments;
      stamp = now();
      thisArg = this;
      trailingCall = trailing && (timeoutId || !leading);

      if (maxWait === false) {
        var leadingCall = leading && !timeoutId;
      } else {
        if (!maxTimeoutId && !leading) {
          lastCalled = stamp;
        }
        var remaining = maxWait - (stamp - lastCalled),
                isCalled = remaining <= 0 || remaining > maxWait;

        if (isCalled) {
          if (maxTimeoutId) {
            maxTimeoutId = clearTimeout(maxTimeoutId);
          }
          lastCalled = stamp;
          result = func.apply(thisArg, args);
        }
        else if (!maxTimeoutId) {
          maxTimeoutId = setTimeout(maxDelayed, remaining);
        }
      }
      if (isCalled && timeoutId) {
        timeoutId = clearTimeout(timeoutId);
      }
      else if (!timeoutId && wait !== maxWait) {
        timeoutId = setTimeout(delayed, wait);
      }
      if (leadingCall) {
        isCalled = true;
        result = func.apply(thisArg, args);
      }
      if (isCalled && !timeoutId && !maxTimeoutId) {
        args = thisArg = undefined;
      }
      return result;
    }

    debounced.cancel = cancel;
    return debounced;
  }

  /**
   * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
   * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // Avoid a V8 JIT bug in Chrome 19-20.
    // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  return debounce;

})();

module.exports = debounce;
},{}],4:[function(_dereq_,module,exports){
var debounce2 = (function () {
  /**
   * Slightly modified version of debounce. Calls fn2 at the beginning of frequent calls to fn1
   * @static
   * @category Function
   * @param {Function} fn1 The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Function} fn2 The function to call the beginning of frequent calls to fn1
   * @returns {Function} Returns the new debounced function.
   */
  function debounce2(fn1, wait, fn2) {
    let timeout;
    let isInit = true;
    return function () {
      const context = this, args = arguments;
      const later = function () {
        timeout = null;
        fn1.apply(context, args);
        isInit = true;
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (isInit) {
        fn2.apply(context, args);
        isInit = false;
      }
    };
  }
  return debounce2;
})();

module.exports = debounce2;
},{}],5:[function(_dereq_,module,exports){
function elementUtilities(cy) {
 return {
  moveNodes: function (positionDiff, nodes, notCalcTopMostNodes) {
    var topMostNodes = notCalcTopMostNodes ? nodes : this.getTopMostNodes(nodes);
    var nonParents = topMostNodes.not(":parent"); 
    // moving parents spoils positioning, so move only nonparents
    nonParents.positions(function(ele, i){
      return {
        x: nonParents[i].position("x") + positionDiff.x,
        y: nonParents[i].position("y") + positionDiff.y
      };
    });
    for (var i = 0; i < topMostNodes.length; i++) {
      var node = topMostNodes[i];
      var children = node.children();
      this.moveNodes(positionDiff, children, true);
    }
  },
  getTopMostNodes: function (nodes) {//*//
    var nodesMap = {};
    for (var i = 0; i < nodes.length; i++) {
      nodesMap[nodes[i].id()] = true;
    }
    var roots = nodes.filter(function (ele, i) {
      if(typeof ele === "number") {
        ele = i;
      }
      
      var parent = ele.parent()[0];
      while (parent != null) {
        if (nodesMap[parent.id()]) {
          return false;
        }
        parent = parent.parent()[0];
      }
      return true;
    });

    return roots;
  },
  rearrange: function (layoutBy) {
    if (typeof layoutBy === "function") {
      layoutBy();
    } else if (layoutBy != null) {
      var layout = cy.layout(layoutBy);
      if (layout && layout.run) {
        layout.run();
      }
    }
  },
  convertToRenderedPosition: function (modelPosition) {
    var pan = cy.pan();
    var zoom = cy.zoom();

    var x = modelPosition.x * zoom + pan.x;
    var y = modelPosition.y * zoom + pan.y;

    return {
      x: x,
      y: y
    };
  }
 };
}

module.exports = elementUtilities;

},{}],6:[function(_dereq_,module,exports){
var boundingBoxUtilities = _dereq_('./boundingBoxUtilities');

// Expand collapse utilities
function expandCollapseUtilities(cy) {
var elementUtilities = _dereq_('./elementUtilities')(cy);
return {
  //the number of nodes moving animatedly after expand operation
  animatedlyMovingNodeCount: 0,
  /*
   * A funtion basicly expanding a node, it is to be called when a node is expanded anyway.
   * Single parameter indicates if the node is expanded alone and if it is truthy then layoutBy parameter is considered to
   * perform layout after expand.
   */
  expandNodeBaseFunction: function (node, single, layoutBy) {
    if (!node._private.data.collapsedChildren){
      return;
    }

    //check how the position of the node is changed
    var positionDiff = {
      x: node._private.position.x - node._private.data['position-before-collapse'].x,
      y: node._private.position.y - node._private.data['position-before-collapse'].y
    };

    node.removeData("infoLabel");
    node.removeClass('cy-expand-collapse-collapsed-node');

    node.trigger("expandcollapse.beforeexpand");
    var restoredNodes = cy.add(node._private.data.collapsedChildren.filter(e => e.group === "nodes"))
    console.log("restored nodes:")
    console.log(restoredNodes.jsons());
    cy.add(node._private.data.collapsedChildren.filter(e => e.group === "edges"))
    var parentData = cy.scratch('_cyExpandCollapse').parentData;
    for(var i = 0; i < restoredNodes.length; i++){
      delete parentData[restoredNodes[i].id()];
    }
    cy.scratch('_cyExpandCollapse').parentData = parentData;
    this.repairEdges(node);
    node._private.data.collapsedChildren = null;

    elementUtilities.moveNodes(positionDiff, node.children());
    node.removeData('position-before-collapse');

    node.trigger("position"); // position not triggered by default when nodes are moved
    node.trigger("expandcollapse.afterexpand");

    // If expand is called just for one node then call end operation to perform layout
    if (single) {
      this.endOperation(layoutBy, node);
    }
  },
  /*
   * A helper function to collapse given nodes in a simple way (Without performing layout afterward)
   * It collapses all root nodes bottom up.
   */
  simpleCollapseGivenNodes: function (nodes) {//*//
    console.log("simple collapse");
    console.log(nodes.jsons())
    nodes.data("collapse", true);
    var roots = elementUtilities.getTopMostNodes(nodes);
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];

      // Collapse the nodes in bottom up order
      this.collapseBottomUp(root);
    }

    return nodes;
  },
  /*
   * A helper function to expand given nodes in a simple way (Without performing layout afterward)
   * It expands all top most nodes top down.
   */
  simpleExpandGivenNodes: function (nodes, applyFishEyeViewToEachNode) {
    nodes.data("expand", true); // Mark that the nodes are still to be expanded
    var roots = elementUtilities.getTopMostNodes(nodes);
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      this.expandTopDown(root, applyFishEyeViewToEachNode); // For each root node expand top down
    }
    return nodes;
  },
  /*
   * Expands all nodes by expanding all top most nodes top down with their descendants.
   */
  simpleExpandAllNodes: function (nodes, applyFishEyeViewToEachNode) {
    if (nodes === undefined) {
      nodes = cy.nodes();
    }
    var orphans;
    orphans = elementUtilities.getTopMostNodes(nodes);
    var expandStack = [];
    for (var i = 0; i < orphans.length; i++) {
      var root = orphans[i];
      this.expandAllTopDown(root, expandStack, applyFishEyeViewToEachNode);
    }
    return expandStack;
  },
  /*
   * The operation to be performed after expand/collapse. It rearrange nodes by layoutBy parameter.
   */
  endOperation: function (layoutBy, nodes) {
    var self = this;
    cy.ready(function () {
      setTimeout(function() {
        elementUtilities.rearrange(layoutBy);
        if(cy.scratch('_cyExpandCollapse').selectableChanged){
          nodes.selectify();
          cy.scratch('_cyExpandCollapse').selectableChanged = false;
        }
      }, 0);

    });
  },
  /*
   * Calls simple expandAllNodes. Then performs end operation.
   */
  expandAllNodes: function (nodes, options) {//*//
    var expandedStack = this.simpleExpandAllNodes(nodes, options.fisheye);

    this.endOperation(options.layoutBy, nodes);

    /*
     * return the nodes to undo the operation
     */
    return expandedStack;
  },
  /*
   * Expands the root and its collapsed descendents in top down order.
   */
  expandAllTopDown: function (root, expandStack, applyFishEyeViewToEachNode) {
    if (root._private.data.collapsedChildren != null) {
      expandStack.push(root);
      this.expandNode(root, applyFishEyeViewToEachNode);
    }
    var children = root.children();
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      this.expandAllTopDown(node, expandStack, applyFishEyeViewToEachNode);
    }
  },
  //Expand the given nodes perform end operation after expandation
  expandGivenNodes: function (nodes, options) {
    // If there is just one node to expand we need to animate for fisheye view, but if there are more then one node we do not
    if (nodes.length === 1) {

      var node = nodes[0];
      if (node._private.data.collapsedChildren != null) {
        // Expand the given node the third parameter indicates that the node is simple which ensures that fisheye parameter will be considered
        this.expandNode(node, options.fisheye, true, options.animate, options.layoutBy, options.animationDuration);
      }
    }
    else {
      // First expand given nodes and then perform layout according to the layoutBy parameter
      this.simpleExpandGivenNodes(nodes, options.fisheye);
      this.endOperation(options.layoutBy, nodes);
    }

    /*
     * return the nodes to undo the operation
     */
    return nodes;
  },
  //collapse the given nodes then perform end operation
  collapseGivenNodes: function (nodes, options) {
    /*
     * In collapse operation there is no fisheye view to be applied so there is no animation to be destroyed here. We can do this
     * in a batch.
     */
    cy.startBatch();
    this.simpleCollapseGivenNodes(nodes/*, options*/);
    cy.endBatch();

    nodes.trigger("position"); // position not triggered by default when collapseNode is called
    this.endOperation(options.layoutBy, nodes);

    // Update the style
    cy.style().update();

    /*
     * return the nodes to undo the operation
     */
    return nodes;
  },
  //collapse the nodes in bottom up order starting from the root
  collapseBottomUp: function (root) {
    var children = root.children();
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      this.collapseBottomUp(node);
    }
    //If the root is a compound node to be collapsed then collapse it
    if (root.data("collapse") && root.children().length > 0) {
      this.collapseNode(root);
      root.removeData("collapse");
    }
  },
  //expand the nodes in top down order starting from the root
  expandTopDown: function (root, applyFishEyeViewToEachNode) {
    if (root.data("expand") && root._private.data.collapsedChildren != null) {
      // Expand the root and unmark its expand data to specify that it is no more to be expanded
      this.expandNode(root, applyFishEyeViewToEachNode);
      root.removeData("expand");
    }
    // Make a recursive call for children of root
    var children = root.children();
    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      this.expandTopDown(node);
    }
  },
  // Converst the rendered position to model position according to global pan and zoom values
  convertToModelPosition: function (renderedPosition) {
    var pan = cy.pan();
    var zoom = cy.zoom();

    var x = (renderedPosition.x - pan.x) / zoom;
    var y = (renderedPosition.y - pan.y) / zoom;

    return {
      x: x,
      y: y
    };
  },
  /*
   * This method expands the given node. It considers applyFishEyeView, animate and layoutBy parameters.
   * It also considers single parameter which indicates if this node is expanded alone. If this parameter is truthy along with
   * applyFishEyeView parameter then the state of view port is to be changed to have extra space on the screen (if needed) before appliying the
   * fisheye view.
   */
  expandNode: function (node, applyFishEyeView, single, animate, layoutBy, animationDuration) {
    var self = this;

    var commonExpandOperation = function (node, applyFishEyeView, single, animate, layoutBy, animationDuration) {
      if (applyFishEyeView) {

        node._private.data['width-before-fisheye'] = node._private.data['size-before-collapse'].w;
        node._private.data['height-before-fisheye'] = node._private.data['size-before-collapse'].h;

        // Fisheye view expand the node.
        // The first paramter indicates the node to apply fisheye view, the third parameter indicates the node
        // to be expanded after fisheye view is applied.
        self.fishEyeViewExpandGivenNode(node, single, node, animate, layoutBy, animationDuration);
      }

      // If one of these parameters is truthy it means that expandNodeBaseFunction is already to be called.
      // However if none of them is truthy we need to call it here.
      if (!single || !applyFishEyeView || !animate) {
        self.expandNodeBaseFunction(node, single, layoutBy);
      }
    };

    if (node._private.data.collapsedChildren != null) {
      this.storeWidthHeight(node);
      var animating = false; // Variable to check if there is a current animation, if there is commonExpandOperation will be called after animation

      // If the node is the only node to expand and fisheye view should be applied, then change the state of viewport
      // to create more space on screen (If needed)
      if (applyFishEyeView && single) {
        var topLeftPosition = this.convertToModelPosition({x: 0, y: 0});
        var bottomRightPosition = this.convertToModelPosition({x: cy.width(), y: cy.height()});
        var padding = 80;
        var bb = {
          x1: topLeftPosition.x,
          x2: bottomRightPosition.x,
          y1: topLeftPosition.y,
          y2: bottomRightPosition.y
        };

        var nodeBB = {
          x1: node._private.position.x - node._private.data['size-before-collapse'].w / 2 - padding,
          x2: node._private.position.x + node._private.data['size-before-collapse'].w / 2 + padding,
          y1: node._private.position.y - node._private.data['size-before-collapse'].h / 2 - padding,
          y2: node._private.position.y + node._private.data['size-before-collapse'].h / 2 + padding
        };

        var unionBB = boundingBoxUtilities.getUnion(nodeBB, bb);

        // If these bboxes are not equal then we need to change the viewport state (by pan and zoom)
        if (!boundingBoxUtilities.equalBoundingBoxes(unionBB, bb)) {
          var viewPort = cy.getFitViewport(unionBB, 10);
          var self = this;
          animating = animate; // Signal that there is an animation now and commonExpandOperation will be called after animation
          // Check if we need to animate during pan and zoom
          if (animate) {
            cy.animate({
              pan: viewPort.pan,
              zoom: viewPort.zoom,
              complete: function () {
                commonExpandOperation(node, applyFishEyeView, single, animate, layoutBy, animationDuration);
              }
            }, {
              duration: animationDuration || 1000
            });
          }
          else {
            cy.zoom(viewPort.zoom);
            cy.pan(viewPort.pan);
          }
        }
      }

      // If animating is not true we need to call commonExpandOperation here
      if (!animating) {
        commonExpandOperation(node, applyFishEyeView, single, animate, layoutBy, animationDuration);
      }

      //return the node to undo the operation
      return node;
    }
  },
  //collapse the given node without performing end operation
  collapseNode: function (node) {
    if (node._private.data.collapsedChildren == null) {
      node.data('position-before-collapse', {
        x: node.position().x,
        y: node.position().y
      });

      node.data('size-before-collapse', {
        w: node.outerWidth(),
        h: node.outerHeight()
      });

      var children = node.children();

      children.unselect();
      children.connectedEdges().unselect();

      node.trigger("expandcollapse.beforecollapse");

      this.barrowEdgesOfcollapsedChildren(node);
      this.removeChildren(node, node);
      node.addClass('cy-expand-collapse-collapsed-node');

      node.trigger("expandcollapse.aftercollapse");

      node.position(node.data('position-before-collapse'));

      //return the node to undo the operation
      return node;
    }
  },
  storeWidthHeight: function (node) {//*//
    if (node != null) {
      node._private.data['x-before-fisheye'] = this.xPositionInParent(node);
      node._private.data['y-before-fisheye'] = this.yPositionInParent(node);
      node._private.data['width-before-fisheye'] = node.outerWidth();
      node._private.data['height-before-fisheye'] = node.outerHeight();

      if (node.parent()[0] != null) {
        this.storeWidthHeight(node.parent()[0]);
      }
    }

  },
  /*
   * Apply fisheye view to the given node. nodeToExpand will be expanded after the operation.
   * The other parameter are to be passed by parameters directly in internal function calls.
   */
  fishEyeViewExpandGivenNode: function (node, single, nodeToExpand, animate, layoutBy, animationDuration) {
    var siblings = this.getSiblings(node);

    var x_a = this.xPositionInParent(node);
    var y_a = this.yPositionInParent(node);

    var d_x_left = Math.abs((node._private.data['width-before-fisheye'] - node.outerWidth()) / 2);
    var d_x_right = Math.abs((node._private.data['width-before-fisheye'] - node.outerWidth()) / 2);
    var d_y_upper = Math.abs((node._private.data['height-before-fisheye'] - node.outerHeight()) / 2);
    var d_y_lower = Math.abs((node._private.data['height-before-fisheye'] - node.outerHeight()) / 2);

    var abs_diff_on_x = Math.abs(node._private.data['x-before-fisheye'] - x_a);
    var abs_diff_on_y = Math.abs(node._private.data['y-before-fisheye'] - y_a);

    // Center went to LEFT
    if (node._private.data['x-before-fisheye'] > x_a) {
      d_x_left = d_x_left + abs_diff_on_x;
      d_x_right = d_x_right - abs_diff_on_x;
    }
    // Center went to RIGHT
    else {
      d_x_left = d_x_left - abs_diff_on_x;
      d_x_right = d_x_right + abs_diff_on_x;
    }

    // Center went to UP
    if (node._private.data['y-before-fisheye'] > y_a) {
      d_y_upper = d_y_upper + abs_diff_on_y;
      d_y_lower = d_y_lower - abs_diff_on_y;
    }
    // Center went to DOWN
    else {
      d_y_upper = d_y_upper - abs_diff_on_y;
      d_y_lower = d_y_lower + abs_diff_on_y;
    }

    var xPosInParentSibling = [];
    var yPosInParentSibling = [];

    for (var i = 0; i < siblings.length; i++) {
      xPosInParentSibling.push(this.xPositionInParent(siblings[i]));
      yPosInParentSibling.push(this.yPositionInParent(siblings[i]));
    }

    for (var i = 0; i < siblings.length; i++) {
      var sibling = siblings[i];

      var x_b = xPosInParentSibling[i];
      var y_b = yPosInParentSibling[i];

      var slope = (y_b - y_a) / (x_b - x_a);

      var d_x = 0;
      var d_y = 0;
      var T_x = 0;
      var T_y = 0;

      // Current sibling is on the LEFT
      if (x_a > x_b) {
        d_x = d_x_left;
      }
      // Current sibling is on the RIGHT
      else {
        d_x = d_x_right;
      }
      // Current sibling is on the UPPER side
      if (y_a > y_b) {
        d_y = d_y_upper;
      }
      // Current sibling is on the LOWER side
      else {
        d_y = d_y_lower;
      }

      if (isFinite(slope)) {
        T_x = Math.min(d_x, (d_y / Math.abs(slope)));
      }

      if (slope !== 0) {
        T_y = Math.min(d_y, (d_x * Math.abs(slope)));
      }

      if (x_a > x_b) {
        T_x = -1 * T_x;
      }

      if (y_a > y_b) {
        T_y = -1 * T_y;
      }

      // Move the sibling in the special way
      this.fishEyeViewMoveNode(sibling, T_x, T_y, nodeToExpand, single, animate, layoutBy, animationDuration);
    }

    // If there is no sibling call expand node base function here else it is to be called one of fishEyeViewMoveNode() calls
    if (siblings.length == 0) {
      this.expandNodeBaseFunction(nodeToExpand, single, layoutBy);
    }

    if (node.parent()[0] != null) {
      // Apply fisheye view to the parent node as well ( If exists )
      this.fishEyeViewExpandGivenNode(node.parent()[0], single, nodeToExpand, animate, layoutBy, animationDuration);
    }

    return node;
  },
  getSiblings: function (node) {
    var siblings;

    if (node.parent()[0] == null) {
      var orphans = cy.nodes(":visible").orphans();
      siblings = orphans.difference(node);
    } else {
      siblings = node.siblings(":visible");
    }

    return siblings;
  },
  /*
   * Move node operation specialized for fish eye view expand operation
   * Moves the node by moving its descandents. Movement is animated if both single and animate flags are truthy.
   */
  fishEyeViewMoveNode: function (node, T_x, T_y, nodeToExpand, single, animate, layoutBy, animationDuration) {
    var childrenList = cy.collection();
    if(node.isParent()){
       childrenList = node.children(":visible");
    }
    var self = this;

    /*
     * If the node is simple move itself directly else move it by moving its children by a self recursive call
     */
    if (childrenList.length == 0) {
      var newPosition = {x: node._private.position.x + T_x, y: node._private.position.y + T_y};
      if (!single || !animate) {
        node._private.position.x = newPosition.x;
        node._private.position.y = newPosition.y;
      }
      else {
        this.animatedlyMovingNodeCount++;
        node.animate({
          position: newPosition,
          complete: function () {
            self.animatedlyMovingNodeCount--;
            if (self.animatedlyMovingNodeCount > 0 || !nodeToExpand.hasClass('cy-expand-collapse-collapsed-node')) {

              return;
            }

            // If all nodes are moved we are ready to expand so call expand node base function
            self.expandNodeBaseFunction(nodeToExpand, single, layoutBy);

          }
        }, {
          duration: animationDuration || 1000
        });
      }
    }
    else {
      for (var i = 0; i < childrenList.length; i++) {
        this.fishEyeViewMoveNode(childrenList[i], T_x, T_y, nodeToExpand, single, animate, layoutBy, animationDuration);
      }
    }
  },
  xPositionInParent: function (node) {//*//
    var parent = node.parent()[0];
    var x_a = 0.0;

    // Given node is not a direct child of the the root graph
    if (parent != null) {
      x_a = node.relativePosition('x') + (parent.width() / 2);
    }
    // Given node is a direct child of the the root graph

    else {
      x_a = node.position('x');
    }

    return x_a;
  },
  yPositionInParent: function (node) {//*//
    var parent = node.parent()[0];

    var y_a = 0.0;

    // Given node is not a direct child of the the root graph
    if (parent != null) {
      y_a = node.relativePosition('y') + (parent.height() / 2);
    }
    // Given node is a direct child of the the root graph

    else {
      y_a = node.position('y');
    }

    return y_a;
  },
  /*
   * for all children of the node parameter call this method
   * with the same root parameter,
   * remove the child and add the removed child to the collapsedchildren data
   * of the root to restore them in the case of expandation
   * root._private.data.collapsedChildren keeps the nodes to restore when the
   * root is expanded
   */
  removeChildren: function (node, root) {
    var children = node.children();
    for (var i = 0; i < children.length; i++) {
      console.log("current child")
      var child = children[i];
      console.log(child.id())
      console.log(child.json())
      console.log(child.jsons())
      this.removeChildren(child, root);
      var parentData = cy.scratch('_cyExpandCollapse').parentData;
      parentData[child.id()] = child.parent();
      cy.scratch('_cyExpandCollapse').parentData = parentData;
      var removedChild = child.remove();
      if (root._private.data.collapsedChildren == null) {
        console.log("noch nix drin")
        root._private.data.collapsedChildren = removedChild.jsons();
        console.log("aber jetzt")
        console.log(root._private.data.collapsedChildren);
      }
      else {
        console.log("already drin:")
        console.log(root._private.data.collapsedChildren);
        root._private.data.collapsedChildren = root._private.data.collapsedChildren.concat(removedChild.jsons());
        console.log("danach:")
        console.log(root._private.data.collapsedChildren);
      }
    }
    // console.log("Removing children of " + node.id())
    // const removed = children.remove();
    // console.log(removed.jsons())
    // root._private.data.collapsedChildren = removed.jsons();
  },
  isMetaEdge: function(edge) {
    return edge.hasClass("cy-expand-collapse-meta-edge");
  },
  barrowEdgesOfcollapsedChildren: function(node) {
    console.log("new target ")
    console.log(node.json());
    var relatedNodes = node.descendants();
    var edges = relatedNodes.edgesWith(cy.nodes().not(relatedNodes.union(node)));

    var relatedNodeMap = {};

    relatedNodes.each(function(ele, i) {
      if(typeof ele === "number") {
        ele = i;
      }
      relatedNodeMap[ele.id()] = true;
    });

    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var source = edge.source();
      var target = edge.target();

      console.log("original target");
      console.log(target.json());

      if (!this.isMetaEdge(edge)) { // is original
        console.log("macht auch was")
        var originalEndsData = {
          source: source.id(),
          target: target.id()
        };

        edge.addClass("cy-expand-collapse-meta-edge");
        edge.data('originalEnds', originalEndsData);
      }

      edge.move({
        target: !relatedNodeMap[target.id()] ? target.id() : node.id(),
        source: !relatedNodeMap[source.id()] ? source.id() : node.id()
      });
    }
  },
  findNewEnd: function(nodeId) {
    console.log("find new end for ")
    console.log(nodeId);
    var current = nodeId;
    var parentData = cy.scratch('_cyExpandCollapse').parentData;
    var parent = parentData[current];

    while( !cy.getElementById(nodeId) ) {
      current = parent;
      parent = parentData[parent.id()];
    }

    return current;
  },
  repairEdges: function(node) {
    var connectedMetaEdges = node.connectedEdges('.cy-expand-collapse-meta-edge');

    for (var i = 0; i < connectedMetaEdges.length; i++) {
      var edge = connectedMetaEdges[i];
      var originalEnds = edge.data('originalEnds');
      var currentSrcId = edge.data('source');
      var currentTgtId = edge.data('target');

      console.log("source");
      console.log(originalEnds.source);
      console.log("target");
      console.log(originalEnds.target);

      if ( currentSrcId === node.id() ) {
        edge = edge.move({
          source: this.findNewEnd(originalEnds.source)
        });
      } else {
        edge = edge.move({
          target: this.findNewEnd(originalEnds.target)
        });
      }

      if ( edge.data('source') === originalEnds.source && edge.data('target') === originalEnds.target ) {
        edge.removeClass('cy-expand-collapse-meta-edge');
        edge.removeData('originalEnds');
      }
    }
  },
  /*node is an outer node of root
   if root is not it's anchestor
   and it is not the root itself*/
  isOuterNode: function (node, root) {//*//
    var temp = node;
    while (temp != null) {
      if (temp == root) {
        return false;
      }
      temp = temp.parent()[0];
    }
    return true;
  },
  /**
   * Get all collapsed children - including nested ones
   * @param node : a collapsed node
   * @param collapsedChildren : a collection to store the result
   * @return : collapsed children
   */
  getCollapsedChildrenRecursively: function(node, collapsedChildren){
    var children = node.data('collapsedChildren') || [];
    var i;
    for (i=0; i < children.length; i++){
      if (children[i].data('collapsedChildren')){
        collapsedChildren = collapsedChildren.union(this.getCollapsedChildrenRecursively(children[i], collapsedChildren));
      }
      collapsedChildren = collapsedChildren.union(children[i]);
    }
    return collapsedChildren;
  },
  /* -------------------------------------- start section edge expand collapse -------------------------------------- */
  collapseGivenEdges: function (edges, options) {
    edges.unselect();
    var nodes = edges.connectedNodes();
    var edgesToCollapse = {};
    // group edges by type if this option is set to true
    if (options.groupEdgesOfSameTypeOnCollapse) {
      edges.forEach(function (edge) {
        var edgeType = "unknown";
        if (options.edgeTypeInfo !== undefined) {
          edgeType = options.edgeTypeInfo instanceof Function ? options.edgeTypeInfo.call(edge) : edge.data()[options.edgeTypeInfo];
        }
        if (edgesToCollapse.hasOwnProperty(edgeType)) {
          edgesToCollapse[edgeType].edges = edgesToCollapse[edgeType].edges.add(edge);

          if (edgesToCollapse[edgeType].directionType == "unidirection" && (edgesToCollapse[edgeType].source != edge.source().id() || edgesToCollapse[edgeType].target != edge.target().id())) {
            edgesToCollapse[edgeType].directionType = "bidirection";
          }
        } else {
          var edgesX = cy.collection();
          edgesX = edgesX.add(edge);
          edgesToCollapse[edgeType] = { edges: edgesX, directionType: "unidirection", source: edge.source().id(), target: edge.target().id() }
        }
      });
    } else {
      edgesToCollapse["unknown"] = { edges: edges, directionType: "unidirection", source: edges[0].source().id(), target: edges[0].target().id() }
      for (var i = 0; i < edges.length; i++) {
        if (edgesToCollapse["unknown"].directionType == "unidirection" && (edgesToCollapse["unknown"].source != edges[i].source().id() || edgesToCollapse["unknown"].target != edges[i].target().id())) {
          edgesToCollapse["unknown"].directionType = "bidirection";
          break;
        }
      }
    }

    var result = { edges: cy.collection(), oldEdges: cy.collection() }
    var newEdges = [];
    for (const edgeGroupType in edgesToCollapse) {
      if (edgesToCollapse[edgeGroupType].edges.length < 2) {
        continue;
      }
      edges.trigger('expandcollapse.beforecollapseedge');
      result.oldEdges = result.oldEdges.add(edgesToCollapse[edgeGroupType].edges);
      var newEdge = {};
      newEdge.group = "edges";
      newEdge.data = {};
      newEdge.data.source = edgesToCollapse[edgeGroupType].source;
      newEdge.data.target = edgesToCollapse[edgeGroupType].target;
      newEdge.data.id = "collapsedEdge_" + nodes[0].id() + "_" + nodes[1].id() + "_" + edgeGroupType + "_" + Math.floor(Math.random() * Date.now());
      newEdge.data.collapsedEdges = cy.collection();

      edgesToCollapse[edgeGroupType].edges.forEach(function (edge) {
        newEdge.data.collapsedEdges = newEdge.data.collapsedEdges.add(edge);
      });

      newEdge.data.collapsedEdges = this.check4nestedCollapse(newEdge.data.collapsedEdges, options);

      var edgesTypeField = "edgeType";
      if (options.edgeTypeInfo !== undefined) {
        edgesTypeField = options.edgeTypeInfo instanceof Function ? edgeTypeField : options.edgeTypeInfo;
      }
      newEdge.data[edgesTypeField] = edgeGroupType;

      newEdge.data["directionType"] = edgesToCollapse[edgeGroupType].directionType;
      newEdge.classes = "cy-expand-collapse-collapsed-edge";

      newEdges.push(newEdge);
      cy.remove(edgesToCollapse[edgeGroupType].edges);
      edges.trigger('expandcollapse.aftercollapseedge');
    }

    result.edges = cy.add(newEdges);
    return result;
  },

  check4nestedCollapse: function(edges2collapse, options){
    if (options.allowNestedEdgeCollapse) {
      return edges2collapse;
    }
    let r = cy.collection();
    for (let i = 0; i < edges2collapse.length; i++) {
      let curr = edges2collapse[i];
      let collapsedEdges = curr.data('collapsedEdges');
      if (collapsedEdges && collapsedEdges.length > 0) {
        r = r.add(collapsedEdges);
      } else {
        r = r.add(curr);
      }
    }
    return r;
  },

  expandEdge: function (edge) {
    edge.unselect();
    var result = { edges: cy.collection(), oldEdges: cy.collection() }
    var edges = edge.data('collapsedEdges');
    if (edges !== undefined && edges.length > 0) {
      edge.trigger('expandcollapse.beforeexpandedge');
      result.oldEdges = result.oldEdges.add(edge);
      cy.remove(edge);
      result.edges = cy.add(edges);
      edge.trigger('expandcollapse.afterexpandedge');
    }
    return result;
  },

  //if the edges are only between two nodes (valid for collpasing) returns the two nodes else it returns false
  isValidEdgesForCollapse: function (edges) {
    var endPoints = this.getEdgesDistinctEndPoints(edges);
    if (endPoints.length != 2) {
      return false;
    } else {
      return endPoints;
    }
  },

  //returns a list of distinct endpoints of a set of edges.
  getEdgesDistinctEndPoints: function (edges) {
    var endPoints = [];
    edges.forEach(function (edge) {
      if (!this.containsElement(endPoints, edge.source())) {
        endPoints.push(edge.source());
      }
      if (!this.containsElement(endPoints, edge.target())) {
        endPoints.push(edge.target());

      }
    }.bind(this));

    return endPoints;
  },

  //function to check if a list of elements contains the given element by looking at id()
  containsElement: function (elements, element) {
    var exists = false;
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].id() == element.id()) {
        exists = true;
        break;
      }
    }
    return exists;
  }
  /* -------------------------------------- end section edge expand collapse -------------------------------------- */
}

};

module.exports = expandCollapseUtilities;

},{"./boundingBoxUtilities":1,"./elementUtilities":5}],7:[function(_dereq_,module,exports){
;
(function () {
  'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function (cytoscape) {

    if (!cytoscape) {
      return;
    } // can't register if cytoscape unspecified

    var undoRedoUtilities = _dereq_('./undoRedoUtilities');
    var cueUtilities = _dereq_("./cueUtilities");

    function extendOptions(options, extendBy) {
      var tempOpts = {};
      for (var key in options)
        tempOpts[key] = options[key];

      for (var key in extendBy)
        if (tempOpts.hasOwnProperty(key))
          tempOpts[key] = extendBy[key];
      return tempOpts;
    }

    // evaluate some specific options in case of they are specified as functions to be dynamically changed
    function evalOptions(options) {
      var animate = typeof options.animate === 'function' ? options.animate.call() : options.animate;
      var fisheye = typeof options.fisheye === 'function' ? options.fisheye.call() : options.fisheye;

      options.animate = animate;
      options.fisheye = fisheye;
    }

    // creates and returns the API instance for the extension
    function createExtensionAPI(cy, expandCollapseUtilities) {
      var api = {}; // API to be returned
      // set functions

      function handleNewOptions( opts ) {
        var currentOpts = getScratch(cy, 'options');
        if ( opts.cueEnabled && !currentOpts.cueEnabled ) {
          api.enableCue();
        }
        else if ( !opts.cueEnabled && currentOpts.cueEnabled ) {
          api.disableCue();
        }
      }

      // set all options at once
      api.setOptions = function(opts) {
        handleNewOptions(opts);
        setScratch(cy, 'options', opts);
      };

      api.extendOptions = function(opts) {
        var options = getScratch(cy, 'options');
        var newOptions = extendOptions( options, opts );
        handleNewOptions(newOptions);
        setScratch(cy, 'options', newOptions);
      }

      // set the option whose name is given
      api.setOption = function (name, value) {
        var opts = {};
        opts[ name ] = value;

        var options = getScratch(cy, 'options');
        var newOptions = extendOptions( options, opts );

        handleNewOptions(newOptions);
        setScratch(cy, 'options', newOptions);
      };

      // Collection functions

      // collapse given eles extend options with given param
      api.collapse = function (_eles, opts) {
        var eles = this.collapsibleNodes(_eles);
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return expandCollapseUtilities.collapseGivenNodes(eles, tempOptions);
      };

      // collapse given eles recursively extend options with given param
      api.collapseRecursively = function (_eles, opts) {
        var eles = this.collapsibleNodes(_eles);
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return this.collapse(eles.union(eles.descendants()), tempOptions);
      };

      // expand given eles extend options with given param
      api.expand = function (_eles, opts) {
        var eles = this.expandableNodes(_eles);
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return expandCollapseUtilities.expandGivenNodes(eles, tempOptions);
      };

      // expand given eles recusively extend options with given param
      api.expandRecursively = function (_eles, opts) {
        var eles = this.expandableNodes(_eles);
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return expandCollapseUtilities.expandAllNodes(eles, tempOptions);
      };


      // Core functions

      // collapse all collapsible nodes
      api.collapseAll = function (opts) {
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return this.collapseRecursively(this.collapsibleNodes(), tempOptions);
      };

      // expand all expandable nodes
      api.expandAll = function (opts) {
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        evalOptions(tempOptions);

        return this.expandRecursively(this.expandableNodes(), tempOptions);
      };


      // Utility functions

      // returns if the given node is expandable
      api.isExpandable = function (node) {
        return node.hasClass('cy-expand-collapse-collapsed-node');
      };

      // returns if the given node is collapsible
      api.isCollapsible = function (node) {
        return !this.isExpandable(node) && node.isParent();
      };

      // get collapsible ones inside given nodes if nodes parameter is not specified consider all nodes
      api.collapsibleNodes = function (_nodes) {
        var self = this;
        var nodes = _nodes ? _nodes : cy.nodes();
        return nodes.filter(function (ele, i) {
          if(typeof ele === "number") {
            ele = i;
          }
          return self.isCollapsible(ele);
        });
      };

      // get expandable ones inside given nodes if nodes parameter is not specified consider all nodes
      api.expandableNodes = function (_nodes) {
        var self = this;
        var nodes = _nodes ? _nodes : cy.nodes();
        return nodes.filter(function (ele, i) {
          if(typeof ele === "number") {
            ele = i;
          }
          return self.isExpandable(ele);
        });
      };

      // Get the children of the given collapsed node which are removed during collapse operation
      api.getCollapsedChildren = function (node) {
        return node.data('collapsedChildren');
      };

      /** Get collapsed children recursively including nested collapsed children
       * Returned value includes edges and nodes, use selector to get edges or nodes
       * @param node : a collapsed node
       * @return all collapsed children
       */
      api.getCollapsedChildrenRecursively = function(node) {
        var collapsedChildren = cy.collection();
        return expandCollapseUtilities.getCollapsedChildrenRecursively(node, collapsedChildren);
      };

      /** Get collapsed children of all collapsed nodes recursively including nested collapsed children
       * Returned value includes edges and nodes, use selector to get edges or nodes
       * @return all collapsed children
       */
      api.getAllCollapsedChildrenRecursively = function(){
        var collapsedChildren = cy.collection();
        var collapsedNodes = cy.nodes(".cy-expand-collapse-collapsed-node");
        var j;
        for (j=0; j < collapsedNodes.length; j++){
            collapsedChildren = collapsedChildren.union(this.getCollapsedChildrenRecursively(collapsedNodes[j]));
        }
        return collapsedChildren;
      };
      // This method forces the visual cue to be cleared. It is to be called in extreme cases
      api.clearVisualCue = function(node) {
        cy.trigger('expandcollapse.clearvisualcue');
      };

      api.disableCue = function() {
        var options = getScratch(cy, 'options');
        if (options.cueEnabled) {
          cueUtilities('unbind', cy, api);
          options.cueEnabled = false;
        }
      };

      api.enableCue = function() {
        var options = getScratch(cy, 'options');
        if (!options.cueEnabled) {
          cueUtilities('rebind', cy, api);
          options.cueEnabled = true;
        }
      };

      api.getParent = function(nodeId) {
        if(cy.getElementById(nodeId)[0] === undefined){
          var parentData = getScratch(cy, 'parentData');
          return parentData[nodeId];
        }
        else{
          return cy.getElementById(nodeId).parent();
        }
      };

      api.collapseEdges = function(edges,opts){
        var result =    {edges: cy.collection(), oldEdges: cy.collection()};
        if(edges.length < 2) return result ;
        if(edges.connectedNodes().length > 2) return result;
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        return expandCollapseUtilities.collapseGivenEdges(edges, tempOptions);
      };
      api.expandEdges = function(edges){
        var result =    {edges: cy.collection(), oldEdges: cy.collection()}
        if(edges === undefined) return result;

        //if(typeof edges[Symbol.iterator] === 'function'){//collection of edges is passed
          edges.forEach(function(edge){
            var operationResult = expandCollapseUtilities.expandEdge(edge);
            result.edges = result.edges.add(operationResult.edges);
            result.oldEdges = result.oldEdges.add(operationResult.oldEdges);

          });
       /*  }else{//one edge passed
          var operationResult = expandCollapseUtilities.expandEdge(edges);
          result.edges = result.edges.add(operationResult.edges);
          result.oldEdges = result.oldEdges.add(operationResult.oldEdges);

        } */

        return result;

      };
      api.collapseEdgesBetweenNodes = function(nodes, opts){
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        function pairwise(list) {
          var pairs = [];
          list
            .slice(0, list.length - 1)
            .forEach(function (first, n) {
              var tail = list.slice(n + 1, list.length);
              tail.forEach(function (item) {
                pairs.push([first, item])
              });
            })
          return pairs;
        }
        var nodesPairs = pairwise(nodes);
        var result = {edges: cy.collection(), oldEdges: cy.collection()};
        nodesPairs.forEach(function(nodePair){
          var edges = nodePair[0].connectedEdges('[source = "'+ nodePair[1].id()+'"],[target = "'+ nodePair[1].id()+'"]');

          if(edges.length >= 2){
            var operationResult = expandCollapseUtilities.collapseGivenEdges(edges, tempOptions)
            result.oldEdges = result.oldEdges.add(operationResult.oldEdges);
            result.edges = result.edges.add(operationResult.edges);
          }

        }.bind(this));

        return result;

      };
      api.expandEdgesBetweenNodes = function(nodes){
        if(nodes.length <= 1) cy.collection();
        var edgesToExpand = cy.collection();
        function pairwise(list) {
          var pairs = [];
          list
            .slice(0, list.length - 1)
            .forEach(function (first, n) {
              var tail = list.slice(n + 1, list.length);
              tail.forEach(function (item) {
                pairs.push([first, item])
              });
            })
          return pairs;
        }
        //var result = {edges: cy.collection(), oldEdges: cy.collection()}   ;
        var nodesPairs = pairwise(nodes);
        nodesPairs.forEach(function(nodePair){
          var edges = nodePair[0].connectedEdges('.cy-expand-collapse-collapsed-edge[source = "'+ nodePair[1].id()+'"],[target = "'+ nodePair[1].id()+'"]');
          edgesToExpand = edgesToExpand.union(edges);

        }.bind(this));
        //result.oldEdges = result.oldEdges.add(edgesToExpand);
        //result.edges = result.edges.add(this.expandEdges(edgesToExpand));
        return this.expandEdges(edgesToExpand);
      };
      api.collapseAllEdges = function(opts){
        var options = getScratch(cy, 'options');
        var tempOptions = extendOptions(options, opts);
        function pairwise(list) {
          var pairs = [];
          list
            .slice(0, list.length - 1)
            .forEach(function (first, n) {
              var tail = list.slice(n + 1, list.length);
              tail.forEach(function (item) {
                pairs.push([first, item])
              });
            })
          return pairs;
        }

        return this.collapseEdgesBetweenNodes(cy.edges().connectedNodes(),opts);
       /*  var nodesPairs = pairwise(cy.edges().connectedNodes());
        nodesPairs.forEach(function(nodePair){
          var edges = nodePair[0].connectedEdges('[source = "'+ nodePair[1].id()+'"],[target = "'+ nodePair[1].id()+'"]');
          if(edges.length >=2){
            expandCollapseUtilities.collapseGivenEdges(edges, tempOptions);
          }

        }.bind(this)); */

      };
      api.expandAllEdges = function(){
        var edges = cy.edges(".cy-expand-collapse-collapsed-edge");
        var result = {edges:cy.collection(), oldEdges : cy.collection()};
        var operationResult = this.expandEdges(edges);
        result.oldEdges = result.oldEdges.add(operationResult.oldEdges);
        result.edges = result.edges.add(operationResult.edges);
        return result;
      };



      return api; // Return the API instance
    }

    // Get the whole scratchpad reserved for this extension (on an element or core) or get a single property of it
    function getScratch (cyOrEle, name) {
      if (cyOrEle.scratch('_cyExpandCollapse') === undefined) {
        cyOrEle.scratch('_cyExpandCollapse', {});
      }

      var scratch = cyOrEle.scratch('_cyExpandCollapse');
      var retVal = ( name === undefined ) ? scratch : scratch[name];
      return retVal;
    }

    // Set a single property on scratchpad of an element or the core
    function setScratch (cyOrEle, name, val) {
      getScratch(cyOrEle)[name] = val;
    }

    // register the extension cy.expandCollapse()
    cytoscape("core", "expandCollapse", function (opts) {
      var cy = this;

      var options = getScratch(cy, 'options') || {
        layoutBy: null, // for rearrange after expand/collapse. It's just layout options or whole layout function. Choose your side!
        fisheye: true, // whether to perform fisheye view after expand/collapse you can specify a function too
        animate: true, // whether to animate on drawing changes you can specify a function too
        animationDuration: 1000, // when animate is true, the duration in milliseconds of the animation
        ready: function () { }, // callback when expand/collapse initialized
        undoable: true, // and if undoRedoExtension exists,

        cueEnabled: true, // Whether cues are enabled
        expandCollapseCuePosition: 'top-left', // default cue position is top left you can specify a function per node too
        expandCollapseCueSize: 12, // size of expand-collapse cue
        expandCollapseCueLineSize: 8, // size of lines used for drawing plus-minus icons
        expandCueImage: undefined, // image of expand icon if undefined draw regular expand cue
        collapseCueImage: undefined, // image of collapse icon if undefined draw regular collapse cue
        expandCollapseCueSensitivity: 1, // sensitivity of expand-collapse cues

        edgeTypeInfo : "edgeType", //the name of the field that has the edge type, retrieved from edge.data(), can be a function
        groupEdgesOfSameTypeOnCollapse: false,
        allowNestedEdgeCollapse: true,
        zIndex: 999 // z-index value of the canvas in which cue ımages are drawn
      };

      // If opts is not 'get' that is it is a real options object then initilize the extension
      if (opts !== 'get') {
        options = extendOptions(options, opts);

        var expandCollapseUtilities = _dereq_('./expandCollapseUtilities')(cy);
        var api = createExtensionAPI(cy, expandCollapseUtilities); // creates and returns the API instance for the extension

        setScratch(cy, 'api', api);

        undoRedoUtilities(cy, api);

        // Only try to render buttons if not headless and option is set
        if (options.cueEnabled && cy.container()) {
          cueUtilities(options, cy, api);
        }

        if ( options.ready ) {
          options.ready();
        }

        setScratch(cy, 'options', options);

        var parentData = {};
        setScratch(cy, 'parentData', parentData);
      }

      return getScratch(cy, 'api'); // Expose the API to the users
    });
  };


  if (typeof module !== 'undefined' && module.exports) { // expose as a commonjs module
    module.exports = register;
  }

  if (typeof define !== 'undefined' && define.amd) { // expose as an amd/requirejs module
    define('cytoscape-expand-collapse', function () {
      return register;
    });
  }

    if (typeof cytoscape !== 'undefined') { // expose to global cytoscape (i.e. window.cytoscape)
      register(cytoscape);
  }

})();

},{"./cueUtilities":2,"./expandCollapseUtilities":6,"./undoRedoUtilities":8}],8:[function(_dereq_,module,exports){
module.exports = function (cy, api) {
  if (cy.undoRedo == null)
    return;

  var ur = cy.undoRedo({}, true);

  function getEles(_eles) {
    return (typeof _eles === "string") ? cy.$(_eles) : _eles;
  }

  function getNodePositions() {
    var positions = {};
    var nodes = cy.nodes();

    for (var i = 0; i < nodes.length; i++) {
      var ele = nodes[i];
      positions[ele.id()] = {
        x: ele.position("x"),
        y: ele.position("y")
      };
    }

    return positions;
  }

  function returnToPositions(positions) {
    var currentPositions = {};
    cy.nodes().not(":parent").positions(function (ele, i) {
      if(typeof ele === "number") {
        ele = i;
      }
      currentPositions[ele.id()] = {
        x: ele.position("x"),
        y: ele.position("y")
      };
      var pos = positions[ele.id()];
      return {
        x: pos.x,
        y: pos.y
      };
    });

    return currentPositions;
  }

  var secondTimeOpts = {
    layoutBy: null,
    animate: false,
    fisheye: false
  };

  function doIt(func) {
    return function (args) {
      var result = {};
      var nodes = getEles(args.nodes);
      if (args.firstTime) {
        result.oldData = getNodePositions();
        result.nodes = func.indexOf("All") > 0 ? api[func](args.options) : api[func](nodes, args.options);
      } else {
        result.oldData = getNodePositions();
        result.nodes = func.indexOf("All") > 0 ? api[func](secondTimeOpts) : api[func](cy.collection(nodes), secondTimeOpts);
        returnToPositions(args.oldData);
      }

      return result;
    };
  }

  var actions = ["collapse", "collapseRecursively", "collapseAll", "expand", "expandRecursively", "expandAll"];

  for (var i = 0; i < actions.length; i++) {
    if(i == 2)
      ur.action("collapseAll", doIt("collapseAll"), doIt("expandRecursively"));
    else if(i == 5)
      ur.action("expandAll", doIt("expandAll"), doIt("collapseRecursively"));
    else
      ur.action(actions[i], doIt(actions[i]), doIt(actions[(i + 3) % 6]));
  }

  function collapseEdges(args){    
    var options = args.options;
    var edges = args.edges;
    var result = {};
    
    result.options = options;
    if(args.firstTime){
      var collapseResult = api.collapseEdges(edges,options);    
      result.edges = collapseResult.edges;
      result.oldEdges = collapseResult.oldEdges;  
      result.firstTime = false;
    }else{
      result.oldEdges = edges;
      result.edges = args.oldEdges;
      if(args.edges.length > 0 && args.oldEdges.length > 0){
        cy.remove(args.edges);
        cy.add(args.oldEdges);
      }
     
     
    }

    return result;
  }
  function collapseEdgesBetweenNodes(args){
    var options = args.options;
    var result = {};
    result.options = options;
    if(args.firstTime){
     var collapseAllResult = api.collapseEdgesBetweenNodes(args.nodes, options);
     result.edges = collapseAllResult.edges;
     result.oldEdges = collapseAllResult.oldEdges;
     result.firstTime = false;
    }else{
     result.edges = args.oldEdges;
     result.oldEdges = args.edges;
     if(args.edges.length > 0 && args.oldEdges.length > 0){
      cy.remove(args.edges);
      cy.add(args.oldEdges);
      }
    
    }
 
    return result;

 }
 function collapseAllEdges(args){
   var options = args.options;
   var result = {};
   result.options = options;
   if(args.firstTime){
    var collapseAllResult = api.collapseAllEdges(options);
    result.edges = collapseAllResult.edges;
    result.oldEdges = collapseAllResult.oldEdges;
    result.firstTime = false;
   }else{
    result.edges = args.oldEdges;
    result.oldEdges = args.edges;
    if(args.edges.length > 0  && args.oldEdges.length > 0){
      cy.remove(args.edges);
      cy.add(args.oldEdges);
      }
   
   }

   return result;
 }
 function expandEdges(args){   
   var options = args.options;
   var result ={};
  
   result.options = options;
   if(args.firstTime){
     var expandResult = api.expandEdges(args.edges);
    result.edges = expandResult.edges;
    result.oldEdges = expandResult.oldEdges;
    result.firstTime = false;
    
   }else{
    result.oldEdges = args.edges;
    result.edges = args.oldEdges;
    if(args.edges.length > 0 && args.oldEdges.length > 0){
      cy.remove(args.edges);
      cy.add(args.oldEdges);
      }
  
   }

   return result;
 }
 function expandEdgesBetweenNodes(args){
  var options = args.options;
  var result = {};
  result.options = options;
  if(args.firstTime){
   var collapseAllResult = api.expandEdgesBetweenNodes(args.nodes,options);
   result.edges = collapseAllResult.edges;
   result.oldEdges = collapseAllResult.oldEdges;
   result.firstTime = false;
  }else{
   result.edges = args.oldEdges;
   result.oldEdges = args.edges;
   if(args.edges.length > 0 && args.oldEdges.length > 0){
    cy.remove(args.edges);
    cy.add(args.oldEdges);
    }
  
  }

  return result;
 }
 function expandAllEdges(args){
  var options = args.options;
  var result = {};
  result.options = options;
  if(args.firstTime){
   var expandResult = api.expandAllEdges(options);
   result.edges = expandResult.edges;
   result.oldEdges = expandResult.oldEdges;
   result.firstTime = false;
  }else{
   result.edges = args.oldEdges;
   result.oldEdges = args.edges;
   if(args.edges.length > 0 && args.oldEdges.length > 0){
    cy.remove(args.edges);
    cy.add(args.oldEdges);
    }
   
  }

  return result;
 }
 
 
  ur.action("collapseEdges", collapseEdges, expandEdges);
  ur.action("expandEdges", expandEdges, collapseEdges);

  ur.action("collapseEdgesBetweenNodes", collapseEdgesBetweenNodes, expandEdgesBetweenNodes);
  ur.action("expandEdgesBetweenNodes", expandEdgesBetweenNodes, collapseEdgesBetweenNodes);

  ur.action("collapseAllEdges", collapseAllEdges, expandAllEdges);
  ur.action("expandAllEdges", expandAllEdges, collapseAllEdges);

 


  


};

},{}]},{},[7])(7)
});

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm91bmRpbmdCb3hVdGlsaXRpZXMuanMiLCJzcmMvY3VlVXRpbGl0aWVzLmpzIiwic3JjL2RlYm91bmNlLmpzIiwic3JjL2RlYm91bmNlMi5qcyIsInNyYy9lbGVtZW50VXRpbGl0aWVzLmpzIiwic3JjL2V4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3VuZG9SZWRvVXRpbGl0aWVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5MUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaGNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0ge1xuICBlcXVhbEJvdW5kaW5nQm94ZXM6IGZ1bmN0aW9uKGJiMSwgYmIyKXtcbiAgICAgIHJldHVybiBiYjEueDEgPT0gYmIyLngxICYmIGJiMS54MiA9PSBiYjIueDIgJiYgYmIxLnkxID09IGJiMi55MSAmJiBiYjEueTIgPT0gYmIyLnkyO1xuICB9LFxuICBnZXRVbmlvbjogZnVuY3Rpb24oYmIxLCBiYjIpe1xuICAgICAgdmFyIHVuaW9uID0ge1xuICAgICAgeDE6IE1hdGgubWluKGJiMS54MSwgYmIyLngxKSxcbiAgICAgIHgyOiBNYXRoLm1heChiYjEueDIsIGJiMi54MiksXG4gICAgICB5MTogTWF0aC5taW4oYmIxLnkxLCBiYjIueTEpLFxuICAgICAgeTI6IE1hdGgubWF4KGJiMS55MiwgYmIyLnkyKSxcbiAgICB9O1xuXG4gICAgdW5pb24udyA9IHVuaW9uLngyIC0gdW5pb24ueDE7XG4gICAgdW5pb24uaCA9IHVuaW9uLnkyIC0gdW5pb24ueTE7XG5cbiAgICByZXR1cm4gdW5pb247XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYm91bmRpbmdCb3hVdGlsaXRpZXM7IiwidmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xudmFyIGRlYm91bmNlMiA9IHJlcXVpcmUoJy4vZGVib3VuY2UyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHBhcmFtcywgY3ksIGFwaSkge1xuICB2YXIgZWxlbWVudFV0aWxpdGllcztcbiAgdmFyIGZuID0gcGFyYW1zO1xuICBjb25zdCBDVUVfUE9TX1VQREFURV9ERUxBWSA9IDEwMDtcbiAgdmFyIG5vZGVXaXRoUmVuZGVyZWRDdWU7XG5cbiAgY29uc3QgZ2V0RGF0YSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2NyYXRjaCA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XG4gICAgcmV0dXJuIHNjcmF0Y2ggJiYgc2NyYXRjaC5jdWVVdGlsaXRpZXM7XG4gIH07XG5cbiAgY29uc3Qgc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIHNjcmF0Y2ggPSBjeS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpO1xuICAgIGlmIChzY3JhdGNoID09IG51bGwpIHtcbiAgICAgIHNjcmF0Y2ggPSB7fTtcbiAgICB9XG5cbiAgICBzY3JhdGNoLmN1ZVV0aWxpdGllcyA9IGRhdGE7XG4gICAgY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnLCBzY3JhdGNoKTtcbiAgfTtcblxuICB2YXIgZnVuY3Rpb25zID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAkY2FudmFzLmNsYXNzTGlzdC5hZGQoXCJleHBhbmQtY29sbGFwc2UtY2FudmFzXCIpO1xuICAgICAgdmFyICRjb250YWluZXIgPSBjeS5jb250YWluZXIoKTtcbiAgICAgIHZhciBjdHggPSAkY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAkY29udGFpbmVyLmFwcGVuZCgkY2FudmFzKTtcblxuICAgICAgZWxlbWVudFV0aWxpdGllcyA9IHJlcXVpcmUoJy4vZWxlbWVudFV0aWxpdGllcycpKGN5KTtcblxuICAgICAgdmFyIG9mZnNldCA9IGZ1bmN0aW9uIChlbHQpIHtcbiAgICAgICAgdmFyIHJlY3QgPSBlbHQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB0b3A6IHJlY3QudG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCxcbiAgICAgICAgICBsZWZ0OiByZWN0LmxlZnQgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBfc2l6ZUNhbnZhcyA9IGRlYm91bmNlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJGNhbnZhcy5oZWlnaHQgPSBjeS5jb250YWluZXIoKS5vZmZzZXRIZWlnaHQ7XG4gICAgICAgICRjYW52YXMud2lkdGggPSBjeS5jb250YWluZXIoKS5vZmZzZXRXaWR0aDtcbiAgICAgICAgJGNhbnZhcy5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgICAgICRjYW52YXMuc3R5bGUudG9wID0gMDtcbiAgICAgICAgJGNhbnZhcy5zdHlsZS5sZWZ0ID0gMDtcbiAgICAgICAgJGNhbnZhcy5zdHlsZS56SW5kZXggPSBvcHRpb25zKCkuekluZGV4O1xuXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBjYW52YXNCYiA9IG9mZnNldCgkY2FudmFzKTtcbiAgICAgICAgICB2YXIgY29udGFpbmVyQmIgPSBvZmZzZXQoJGNvbnRhaW5lcik7XG4gICAgICAgICAgJGNhbnZhcy5zdHlsZS50b3AgPSAtKGNhbnZhc0JiLnRvcCAtIGNvbnRhaW5lckJiLnRvcCk7XG4gICAgICAgICAgJGNhbnZhcy5zdHlsZS5sZWZ0ID0gLShjYW52YXNCYi5sZWZ0IC0gY29udGFpbmVyQmIubGVmdCk7XG5cbiAgICAgICAgICAvLyByZWZyZXNoIHRoZSBjdWVzIG9uIGNhbnZhcyByZXNpemVcbiAgICAgICAgICBpZiAoY3kpIHtcbiAgICAgICAgICAgIGNsZWFyRHJhd3ModHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCAwKTtcblxuICAgICAgfSwgMjUwKTtcblxuICAgICAgZnVuY3Rpb24gc2l6ZUNhbnZhcygpIHtcbiAgICAgICAgX3NpemVDYW52YXMoKTtcbiAgICAgIH1cblxuICAgICAgc2l6ZUNhbnZhcygpO1xuXG4gICAgICB2YXIgZGF0YSA9IHt9O1xuXG4gICAgICAvLyBpZiB0aGVyZSBhcmUgZXZlbnRzIGZpZWxkIGluIGRhdGEgdW5iaW5kIHRoZW0gaGVyZVxuICAgICAgLy8gdG8gcHJldmVudCBiaW5kaW5nIHRoZSBzYW1lIGV2ZW50IG11bHRpcGxlIHRpbWVzXG4gICAgICAvLyBpZiAoIWRhdGEuaGFzRXZlbnRGaWVsZHMpIHtcbiAgICAgIC8vICAgZnVuY3Rpb25zWyd1bmJpbmQnXS5hcHBseSggJGNvbnRhaW5lciApO1xuICAgICAgLy8gfVxuXG4gICAgICBmdW5jdGlvbiBvcHRpb25zKCkge1xuICAgICAgICByZXR1cm4gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5vcHRpb25zO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjbGVhckRyYXdzKCkge1xuICAgICAgICB2YXIgdyA9IGN5LndpZHRoKCk7XG4gICAgICAgIHZhciBoID0gY3kuaGVpZ2h0KCk7XG5cbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB3LCBoKTtcbiAgICAgICAgbm9kZVdpdGhSZW5kZXJlZEN1ZSA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShub2RlKSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcbiAgICAgICAgdmFyIGNvbGxhcHNlZENoaWxkcmVuID0gbm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpO1xuICAgICAgICB2YXIgaGFzQ2hpbGRyZW4gPSBjaGlsZHJlbiAhPSBudWxsICYmIGNoaWxkcmVuICE9IHVuZGVmaW5lZCAmJiBjaGlsZHJlbi5sZW5ndGggPiAwO1xuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgc2ltcGxlIG5vZGUgd2l0aCBubyBjb2xsYXBzZWQgY2hpbGRyZW4gcmV0dXJuIGRpcmVjdGx5XG4gICAgICAgIGlmICghaGFzQ2hpbGRyZW4gJiYgIWNvbGxhcHNlZENoaWxkcmVuKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGlzQ29sbGFwc2VkID0gbm9kZS5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XG5cbiAgICAgICAgLy9EcmF3IGV4cGFuZC1jb2xsYXBzZSByZWN0YW5nbGVzXG4gICAgICAgIHZhciByZWN0U2l6ZSA9IG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVNpemU7XG4gICAgICAgIHZhciBsaW5lU2l6ZSA9IG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZUxpbmVTaXplO1xuXG4gICAgICAgIHZhciBjdWVDZW50ZXI7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMoKS5leHBhbmRDb2xsYXBzZUN1ZVBvc2l0aW9uID09PSAndG9wLWxlZnQnKSB7XG4gICAgICAgICAgdmFyIG9mZnNldCA9IDE7XG4gICAgICAgICAgdmFyIHNpemUgPSBjeS56b29tKCkgPCAxID8gcmVjdFNpemUgLyAoMiAqIGN5Lnpvb20oKSkgOiByZWN0U2l6ZSAvIDI7XG4gICAgICAgICAgdmFyIG5vZGVCb3JkZXJXaWQgPSBwYXJzZUZsb2F0KG5vZGUuY3NzKCdib3JkZXItd2lkdGgnKSk7XG4gICAgICAgICAgdmFyIHggPSBub2RlLnBvc2l0aW9uKCd4JykgLSBub2RlLndpZHRoKCkgLyAyIC0gcGFyc2VGbG9hdChub2RlLmNzcygncGFkZGluZy1sZWZ0JykpXG4gICAgICAgICAgICArIG5vZGVCb3JkZXJXaWQgKyBzaXplICsgb2Zmc2V0O1xuICAgICAgICAgIHZhciB5ID0gbm9kZS5wb3NpdGlvbigneScpIC0gbm9kZS5oZWlnaHQoKSAvIDIgLSBwYXJzZUZsb2F0KG5vZGUuY3NzKCdwYWRkaW5nLXRvcCcpKVxuICAgICAgICAgICAgKyBub2RlQm9yZGVyV2lkICsgc2l6ZSArIG9mZnNldDtcblxuICAgICAgICAgIGN1ZUNlbnRlciA9IHsgeDogeCwgeTogeSB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBvcHRpb24gPSBvcHRpb25zKCkuZXhwYW5kQ29sbGFwc2VDdWVQb3NpdGlvbjtcbiAgICAgICAgICBjdWVDZW50ZXIgPSB0eXBlb2Ygb3B0aW9uID09PSAnZnVuY3Rpb24nID8gb3B0aW9uLmNhbGwodGhpcywgbm9kZSkgOiBvcHRpb247XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VDZW50ZXIgPSBlbGVtZW50VXRpbGl0aWVzLmNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb24oY3VlQ2VudGVyKTtcblxuICAgICAgICAvLyBjb252ZXJ0IHRvIHJlbmRlcmVkIHNpemVzXG4gICAgICAgIHJlY3RTaXplID0gTWF0aC5tYXgocmVjdFNpemUsIHJlY3RTaXplICogY3kuem9vbSgpKTtcbiAgICAgICAgbGluZVNpemUgPSBNYXRoLm1heChsaW5lU2l6ZSwgbGluZVNpemUgKiBjeS56b29tKCkpO1xuICAgICAgICB2YXIgZGlmZiA9IChyZWN0U2l6ZSAtIGxpbmVTaXplKSAvIDI7XG5cbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlQ2VudGVyWCA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyLng7XG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZUNlbnRlclkgPSBleHBhbmRjb2xsYXBzZUNlbnRlci55O1xuXG4gICAgICAgIHZhciBleHBhbmRjb2xsYXBzZVN0YXJ0WCA9IGV4cGFuZGNvbGxhcHNlQ2VudGVyWCAtIHJlY3RTaXplIC8gMjtcbiAgICAgICAgdmFyIGV4cGFuZGNvbGxhcHNlU3RhcnRZID0gZXhwYW5kY29sbGFwc2VDZW50ZXJZIC0gcmVjdFNpemUgLyAyO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZWN0U2l6ZSA9IHJlY3RTaXplO1xuXG4gICAgICAgIC8vIERyYXcgZXhwYW5kL2NvbGxhcHNlIGN1ZSBpZiBzcGVjaWZpZWQgdXNlIGFuIGltYWdlIGVsc2UgcmVuZGVyIGl0IGluIHRoZSBkZWZhdWx0IHdheVxuICAgICAgICBpZiAoaXNDb2xsYXBzZWQgJiYgb3B0aW9ucygpLmV4cGFuZEN1ZUltYWdlKSB7XG4gICAgICAgICAgZHJhd0ltZyhvcHRpb25zKCkuZXhwYW5kQ3VlSW1hZ2UsIGV4cGFuZGNvbGxhcHNlU3RhcnRYLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSwgcmVjdFNpemUsIHJlY3RTaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICghaXNDb2xsYXBzZWQgJiYgb3B0aW9ucygpLmNvbGxhcHNlQ3VlSW1hZ2UpIHtcbiAgICAgICAgICBkcmF3SW1nKG9wdGlvbnMoKS5jb2xsYXBzZUN1ZUltYWdlLCBleHBhbmRjb2xsYXBzZVN0YXJ0WCwgZXhwYW5kY29sbGFwc2VTdGFydFksIHJlY3RTaXplLCByZWN0U2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdmFyIG9sZEZpbGxTdHlsZSA9IGN0eC5maWxsU3R5bGU7XG4gICAgICAgICAgdmFyIG9sZFdpZHRoID0gY3R4LmxpbmVXaWR0aDtcbiAgICAgICAgICB2YXIgb2xkU3Ryb2tlU3R5bGUgPSBjdHguc3Ryb2tlU3R5bGU7XG5cbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xuICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiYmxhY2tcIjtcblxuICAgICAgICAgIGN0eC5lbGxpcHNlKGV4cGFuZGNvbGxhcHNlQ2VudGVyWCwgZXhwYW5kY29sbGFwc2VDZW50ZXJZLCByZWN0U2l6ZSAvIDIsIHJlY3RTaXplIC8gMiwgMCwgMCwgMiAqIE1hdGguUEkpO1xuICAgICAgICAgIGN0eC5maWxsKCk7XG5cbiAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG5cbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIndoaXRlXCI7XG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IE1hdGgubWF4KDIuNiwgMi42ICogY3kuem9vbSgpKTtcblxuICAgICAgICAgIGN0eC5tb3ZlVG8oZXhwYW5kY29sbGFwc2VTdGFydFggKyBkaWZmLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIHJlY3RTaXplIC8gMik7XG4gICAgICAgICAgY3R4LmxpbmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIGxpbmVTaXplICsgZGlmZiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyByZWN0U2l6ZSAvIDIpO1xuXG4gICAgICAgICAgaWYgKGlzQ29sbGFwc2VkKSB7XG4gICAgICAgICAgICBjdHgubW92ZVRvKGV4cGFuZGNvbGxhcHNlU3RhcnRYICsgcmVjdFNpemUgLyAyLCBleHBhbmRjb2xsYXBzZVN0YXJ0WSArIGRpZmYpO1xuICAgICAgICAgICAgY3R4LmxpbmVUbyhleHBhbmRjb2xsYXBzZVN0YXJ0WCArIHJlY3RTaXplIC8gMiwgZXhwYW5kY29sbGFwc2VTdGFydFkgKyBsaW5lU2l6ZSArIGRpZmYpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICAgICAgICBjdHguc3Ryb2tlKCk7XG5cbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBvbGRTdHJva2VTdHlsZTtcbiAgICAgICAgICBjdHguZmlsbFN0eWxlID0gb2xkRmlsbFN0eWxlO1xuICAgICAgICAgIGN0eC5saW5lV2lkdGggPSBvbGRXaWR0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYID0gZXhwYW5kY29sbGFwc2VTdGFydFg7XG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZID0gZXhwYW5kY29sbGFwc2VTdGFydFk7XG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YS5leHBhbmRjb2xsYXBzZVJlbmRlcmVkQ3VlU2l6ZSA9IGV4cGFuZGNvbGxhcHNlUmVjdFNpemU7XG5cbiAgICAgICAgbm9kZVdpdGhSZW5kZXJlZEN1ZSA9IG5vZGU7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGRyYXdJbWcoaW1nU3JjLCB4LCB5LCB3LCBoKSB7XG4gICAgICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UodywgaCk7XG4gICAgICAgIGltZy5zcmMgPSBpbWdTcmM7XG4gICAgICAgIGltZy5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIHgsIHksIHcsIGgpO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjeS5vbigncmVzaXplJywgZGF0YS5lQ3lSZXNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNpemVDYW52YXMoKTtcbiAgICAgIH0pO1xuXG4gICAgICBjeS5vbignZXhwYW5kY29sbGFwc2UuY2xlYXJ2aXN1YWxjdWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChub2RlV2l0aFJlbmRlcmVkQ3VlKSB7XG4gICAgICAgICAgY2xlYXJEcmF3cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdmFyIG9sZE1vdXNlUG9zID0gbnVsbCwgY3Vyck1vdXNlUG9zID0gbnVsbDtcbiAgICAgIGN5Lm9uKCdtb3VzZWRvd24nLCBkYXRhLmVNb3VzZURvd24gPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICBvbGRNb3VzZVBvcyA9IGUucmVuZGVyZWRQb3NpdGlvbiB8fCBlLmN5UmVuZGVyZWRQb3NpdGlvblxuICAgICAgfSk7XG5cbiAgICAgIGN5Lm9uKCdtb3VzZXVwJywgZGF0YS5lTW91c2VVcCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGN1cnJNb3VzZVBvcyA9IGUucmVuZGVyZWRQb3NpdGlvbiB8fCBlLmN5UmVuZGVyZWRQb3NpdGlvblxuICAgICAgfSk7XG5cbiAgICAgIGN5Lm9uKCdyZW1vdmUnLCAnbm9kZScsIGRhdGEuZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2xlYXJEcmF3cygpO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciB1cjtcbiAgICAgIGN5Lm9uKCdzZWxlY3QgdW5zZWxlY3QnLCBkYXRhLmVTZWxlY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChub2RlV2l0aFJlbmRlcmVkQ3VlKSB7XG4gICAgICAgICAgY2xlYXJEcmF3cygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpc09ubHkxU2VsZWN0ZWQgPSBjeS4kKCc6c2VsZWN0ZWQnKS5sZW5ndGggPT0gMTtcbiAgICAgICAgdmFyIGlzT25seTFTZWxlY3RlZENvbXB1bmROb2RlID0gY3kubm9kZXMoJzpwYXJlbnQnKS5maWx0ZXIoJzpzZWxlY3RlZCcpLmxlbmd0aCA9PSAxICYmIGlzT25seTFTZWxlY3RlZDtcbiAgICAgICAgdmFyIGlzT25seTFTZWxlY3RlZENvbGxhcHNlZE5vZGUgPSBjeS5ub2RlcygnLmN5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpLmZpbHRlcignOnNlbGVjdGVkJykubGVuZ3RoID09IDEgJiYgaXNPbmx5MVNlbGVjdGVkO1xuICAgICAgICBpZiAoaXNPbmx5MVNlbGVjdGVkQ29sbGFwc2VkTm9kZSB8fCBpc09ubHkxU2VsZWN0ZWRDb21wdW5kTm9kZSkge1xuICAgICAgICAgIGRyYXdFeHBhbmRDb2xsYXBzZUN1ZShjeS5ub2RlcygnOnNlbGVjdGVkJylbMF0pO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY3kub24oJ3RhcCcsIGRhdGEuZVRhcCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgbm9kZSA9IG5vZGVXaXRoUmVuZGVyZWRDdWU7XG4gICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCA9IG5vZGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WCcpO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WSA9IG5vZGUuZGF0YSgnZXhwYW5kY29sbGFwc2VSZW5kZXJlZFN0YXJ0WScpO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplID0gbm9kZS5kYXRhKCdleHBhbmRjb2xsYXBzZVJlbmRlcmVkQ3VlU2l6ZScpO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFggPSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplO1xuICAgICAgICB2YXIgZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgPSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZICsgZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplO1xuXG4gICAgICAgIHZhciBjeVJlbmRlcmVkUG9zID0gZXZlbnQucmVuZGVyZWRQb3NpdGlvbiB8fCBldmVudC5jeVJlbmRlcmVkUG9zaXRpb247XG4gICAgICAgIHZhciBjeVJlbmRlcmVkUG9zWCA9IGN5UmVuZGVyZWRQb3MueDtcbiAgICAgICAgdmFyIGN5UmVuZGVyZWRQb3NZID0gY3lSZW5kZXJlZFBvcy55O1xuICAgICAgICB2YXIgb3B0cyA9IG9wdGlvbnMoKTtcbiAgICAgICAgdmFyIGZhY3RvciA9IChvcHRzLmV4cGFuZENvbGxhcHNlQ3VlU2Vuc2l0aXZpdHkgLSAxKSAvIDI7XG5cbiAgICAgICAgaWYgKChNYXRoLmFicyhvbGRNb3VzZVBvcy54IC0gY3Vyck1vdXNlUG9zLngpIDwgNSAmJiBNYXRoLmFicyhvbGRNb3VzZVBvcy55IC0gY3Vyck1vdXNlUG9zLnkpIDwgNSlcbiAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWCA+PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRYIC0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXG4gICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1ggPD0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFggKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3JcbiAgICAgICAgICAmJiBjeVJlbmRlcmVkUG9zWSA+PSBleHBhbmRjb2xsYXBzZVJlbmRlcmVkU3RhcnRZIC0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZFJlY3RTaXplICogZmFjdG9yXG4gICAgICAgICAgJiYgY3lSZW5kZXJlZFBvc1kgPD0gZXhwYW5kY29sbGFwc2VSZW5kZXJlZEVuZFkgKyBleHBhbmRjb2xsYXBzZVJlbmRlcmVkUmVjdFNpemUgKiBmYWN0b3IpIHtcbiAgICAgICAgICBpZiAob3B0cy51bmRvYWJsZSAmJiAhdXIpIHtcbiAgICAgICAgICAgIHVyID0gY3kudW5kb1JlZG8oeyBkZWZhdWx0QWN0aW9uczogZmFsc2UgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGFwaS5pc0NvbGxhcHNpYmxlKG5vZGUpKSB7XG4gICAgICAgICAgICBjbGVhckRyYXdzKCk7XG4gICAgICAgICAgICBpZiAob3B0cy51bmRvYWJsZSkge1xuICAgICAgICAgICAgICB1ci5kbyhcImNvbGxhcHNlXCIsIHtcbiAgICAgICAgICAgICAgICBub2Rlczogbm9kZSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBvcHRzXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGFwaS5jb2xsYXBzZShub2RlLCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoYXBpLmlzRXhwYW5kYWJsZShub2RlKSkge1xuICAgICAgICAgICAgY2xlYXJEcmF3cygpO1xuICAgICAgICAgICAgaWYgKG9wdHMudW5kb2FibGUpIHtcbiAgICAgICAgICAgICAgdXIuZG8oXCJleHBhbmRcIiwgeyBub2Rlczogbm9kZSwgb3B0aW9uczogb3B0cyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBhcGkuZXhwYW5kKG5vZGUsIG9wdHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobm9kZS5zZWxlY3RhYmxlKCkpIHtcbiAgICAgICAgICAgIG5vZGUudW5zZWxlY3RpZnkoKTtcbiAgICAgICAgICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykuc2VsZWN0YWJsZUNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGN5Lm9uKCdwb3NpdGlvbicsICdub2RlJywgZGF0YS5lUG9zaXRpb24gPSBkZWJvdW5jZTIoZGF0YS5lU2VsZWN0LCBDVUVfUE9TX1VQREFURV9ERUxBWSwgY2xlYXJEcmF3cykpO1xuXG4gICAgICBjeS5vbigncGFuIHpvb20nLCBkYXRhLmVQb3NpdGlvbik7XG5cbiAgICAgIGN5Lm9uKCdleHBhbmRjb2xsYXBzZS5hZnRlcmV4cGFuZCBleHBhbmRjb2xsYXBzZS5hZnRlcmNvbGxhcHNlJywgJ25vZGUnLCBkYXRhLmVBZnRlckV4cGFuZENvbGxhcHNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGVsYXkgPSA1MCArIHBhcmFtcy5hbmltYXRlID8gcGFyYW1zLmFuaW1hdGlvbkR1cmF0aW9uIDogMDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWQoKSkge1xuICAgICAgICAgICAgZHJhd0V4cGFuZENvbGxhcHNlQ3VlKHRoaXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZGVsYXkpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIHdyaXRlIG9wdGlvbnMgdG8gZGF0YVxuICAgICAgZGF0YS5oYXNFdmVudEZpZWxkcyA9IHRydWU7XG4gICAgICBzZXREYXRhKGRhdGEpO1xuICAgIH0sXG4gICAgdW5iaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyB2YXIgJGNvbnRhaW5lciA9IHRoaXM7XG4gICAgICB2YXIgZGF0YSA9IGdldERhdGEoKTtcblxuICAgICAgaWYgKCFkYXRhLmhhc0V2ZW50RmllbGRzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdldmVudHMgdG8gdW5iaW5kIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY3kudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuY2xlYXJ2aXN1YWxjdWUnKTtcblxuICAgICAgY3kub2ZmKCdtb3VzZWRvd24nLCAnbm9kZScsIGRhdGEuZU1vdXNlRG93bilcbiAgICAgICAgLm9mZignbW91c2V1cCcsICdub2RlJywgZGF0YS5lTW91c2VVcClcbiAgICAgICAgLm9mZigncmVtb3ZlJywgJ25vZGUnLCBkYXRhLmVSZW1vdmUpXG4gICAgICAgIC5vZmYoJ3RhcCcsICdub2RlJywgZGF0YS5lVGFwKVxuICAgICAgICAub2ZmKCdhZGQnLCAnbm9kZScsIGRhdGEuZUFkZClcbiAgICAgICAgLm9mZigncG9zaXRpb24nLCAnbm9kZScsIGRhdGEuZVBvc2l0aW9uKVxuICAgICAgICAub2ZmKCdwYW4gem9vbScsIGRhdGEuZVBvc2l0aW9uKVxuICAgICAgICAub2ZmKCdzZWxlY3QgdW5zZWxlY3QnLCBkYXRhLmVTZWxlY3QpXG4gICAgICAgIC5vZmYoJ2V4cGFuZGNvbGxhcHNlLmFmdGVyZXhwYW5kIGV4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2UnLCAnbm9kZScsIGRhdGEuZUFmdGVyRXhwYW5kQ29sbGFwc2UpXG4gICAgICAgIC5vZmYoJ2ZyZWUnLCAnbm9kZScsIGRhdGEuZUZyZWUpXG4gICAgICAgIC5vZmYoJ3Jlc2l6ZScsIGRhdGEuZUN5UmVzaXplKTtcbiAgICB9LFxuICAgIHJlYmluZDogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGRhdGEgPSBnZXREYXRhKCk7XG5cbiAgICAgIGlmICghZGF0YS5oYXNFdmVudEZpZWxkcykge1xuICAgICAgICBjb25zb2xlLmxvZygnZXZlbnRzIHRvIHJlYmluZCBkb2VzIG5vdCBleGlzdCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGN5Lm9uKCdtb3VzZWRvd24nLCAnbm9kZScsIGRhdGEuZU1vdXNlRG93bilcbiAgICAgICAgLm9uKCdtb3VzZXVwJywgJ25vZGUnLCBkYXRhLmVNb3VzZVVwKVxuICAgICAgICAub24oJ3JlbW92ZScsICdub2RlJywgZGF0YS5lUmVtb3ZlKVxuICAgICAgICAub24oJ3RhcCcsICdub2RlJywgZGF0YS5lVGFwKVxuICAgICAgICAub24oJ2FkZCcsICdub2RlJywgZGF0YS5lQWRkKVxuICAgICAgICAub24oJ3Bvc2l0aW9uJywgJ25vZGUnLCBkYXRhLmVQb3NpdGlvbilcbiAgICAgICAgLm9uKCdwYW4gem9vbScsIGRhdGEuZVBvc2l0aW9uKVxuICAgICAgICAub24oJ3NlbGVjdCB1bnNlbGVjdCcsIGRhdGEuZVNlbGVjdClcbiAgICAgICAgLm9uKCdleHBhbmRjb2xsYXBzZS5hZnRlcmV4cGFuZCBleHBhbmRjb2xsYXBzZS5hZnRlcmNvbGxhcHNlJywgJ25vZGUnLCBkYXRhLmVBZnRlckV4cGFuZENvbGxhcHNlKVxuICAgICAgICAub24oJ2ZyZWUnLCAnbm9kZScsIGRhdGEuZUZyZWUpXG4gICAgICAgIC5vbigncmVzaXplJywgZGF0YS5lQ3lSZXNpemUpO1xuICAgIH1cbiAgfTtcblxuICBpZiAoZnVuY3Rpb25zW2ZuXSkge1xuICAgIHJldHVybiBmdW5jdGlvbnNbZm5dLmFwcGx5KGN5LmNvbnRhaW5lcigpLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZm4gPT0gJ29iamVjdCcgfHwgIWZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9ucy5pbml0LmFwcGx5KGN5LmNvbnRhaW5lcigpLCBhcmd1bWVudHMpO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcignTm8gc3VjaCBmdW5jdGlvbiBgJyArIGZuICsgJ2AgZm9yIGN5dG9zY2FwZS5qcy1leHBhbmQtY29sbGFwc2UnKTtcblxufTtcbiIsInZhciBkZWJvdW5jZSA9IChmdW5jdGlvbiAoKSB7XG4gIC8qKlxuICAgKiBsb2Rhc2ggMy4xLjEgKEN1c3RvbSBCdWlsZCkgPGh0dHBzOi8vbG9kYXNoLmNvbS8+XG4gICAqIEJ1aWxkOiBgbG9kYXNoIG1vZGVybiBtb2R1bGFyaXplIGV4cG9ydHM9XCJucG1cIiAtbyAuL2BcbiAgICogQ29weXJpZ2h0IDIwMTItMjAxNSBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAgICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjguMyA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAgICogQ29weXJpZ2h0IDIwMDktMjAxNSBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICAgKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHBzOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICAgKi9cbiAgLyoqIFVzZWQgYXMgdGhlIGBUeXBlRXJyb3JgIG1lc3NhZ2UgZm9yIFwiRnVuY3Rpb25zXCIgbWV0aG9kcy4gKi9cbiAgdmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcblxuICAvKiBOYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgZm9yIHRob3NlIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzLiAqL1xuICB2YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXgsXG4gICAgICAgICAgbmF0aXZlTm93ID0gRGF0ZS5ub3c7XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIFVuaXggZXBvY2hcbiAgICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IERhdGVcbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogXy5kZWZlcihmdW5jdGlvbihzdGFtcCkge1xuICAgKiAgIGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7XG4gICAqIH0sIF8ubm93KCkpO1xuICAgKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gICAqL1xuICB2YXIgbm93ID0gbmF0aXZlTm93IHx8IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBkZWJvdW5jZWQgZnVuY3Rpb24gdGhhdCBkZWxheXMgaW52b2tpbmcgYGZ1bmNgIHVudGlsIGFmdGVyIGB3YWl0YFxuICAgKiBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3YXNcbiAgICogaW52b2tlZC4gVGhlIGRlYm91bmNlZCBmdW5jdGlvbiBjb21lcyB3aXRoIGEgYGNhbmNlbGAgbWV0aG9kIHRvIGNhbmNlbFxuICAgKiBkZWxheWVkIGludm9jYXRpb25zLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgXG4gICAqIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC5cbiAgICogU3Vic2VxdWVudCBjYWxscyB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0XG4gICAqIGBmdW5jYCBpbnZvY2F0aW9uLlxuICAgKlxuICAgKiAqKk5vdGU6KiogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCwgYGZ1bmNgIGlzIGludm9rZWRcbiAgICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xuICAgKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gICAqXG4gICAqIFNlZSBbRGF2aWQgQ29yYmFjaG8ncyBhcnRpY2xlXShodHRwOi8vZHJ1cGFsbW90aW9uLmNvbS9hcnRpY2xlL2RlYm91bmNlLWFuZC10aHJvdHRsZS12aXN1YWwtZXhwbGFuYXRpb24pXG4gICAqIGZvciBkZXRhaWxzIG92ZXIgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gYF8uZGVib3VuY2VgIGFuZCBgXy50aHJvdHRsZWAuXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxuICAgKiBAcGFyYW0ge251bWJlcn0gW3dhaXQ9MF0gVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgaW52b2tpbmcgb24gdGhlIGxlYWRpbmdcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlXG4gICAqICBkZWxheWVkIGJlZm9yZSBpdCdzIGludm9rZWQuXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBpbnZva2luZyBvbiB0aGUgdHJhaWxpbmdcbiAgICogIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAgICogQGV4YW1wbGVcbiAgICpcbiAgICogLy8gYXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eFxuICAgKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCkpO1xuICAgKlxuICAgKiAvLyBpbnZva2UgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXG4gICAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAgICogICAnbGVhZGluZyc6IHRydWUsXG4gICAqICAgJ3RyYWlsaW5nJzogZmFsc2VcbiAgICogfSkpO1xuICAgKlxuICAgKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBpbnZva2VkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXG4gICAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAgICogalF1ZXJ5KHNvdXJjZSkub24oJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcbiAgICogICAnbWF4V2FpdCc6IDEwMDBcbiAgICogfSkpO1xuICAgKlxuICAgKiAvLyBjYW5jZWwgYSBkZWJvdW5jZWQgY2FsbFxuICAgKiB2YXIgdG9kb0NoYW5nZXMgPSBfLmRlYm91bmNlKGJhdGNoTG9nLCAxMDAwKTtcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLnRvZG8sIHRvZG9DaGFuZ2VzKTtcbiAgICpcbiAgICogT2JqZWN0Lm9ic2VydmUobW9kZWxzLCBmdW5jdGlvbihjaGFuZ2VzKSB7XG4gICAqICAgaWYgKF8uZmluZChjaGFuZ2VzLCB7ICd1c2VyJzogJ3RvZG8nLCAndHlwZSc6ICdkZWxldGUnfSkpIHtcbiAgICogICAgIHRvZG9DaGFuZ2VzLmNhbmNlbCgpO1xuICAgKiAgIH1cbiAgICogfSwgWydkZWxldGUnXSk7XG4gICAqXG4gICAqIC8vIC4uLmF0IHNvbWUgcG9pbnQgYG1vZGVscy50b2RvYCBpcyBjaGFuZ2VkXG4gICAqIG1vZGVscy50b2RvLmNvbXBsZXRlZCA9IHRydWU7XG4gICAqXG4gICAqIC8vIC4uLmJlZm9yZSAxIHNlY29uZCBoYXMgcGFzc2VkIGBtb2RlbHMudG9kb2AgaXMgZGVsZXRlZFxuICAgKiAvLyB3aGljaCBjYW5jZWxzIHRoZSBkZWJvdW5jZWQgYHRvZG9DaGFuZ2VzYCBjYWxsXG4gICAqIGRlbGV0ZSBtb2RlbHMudG9kbztcbiAgICovXG4gIGZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgYXJncyxcbiAgICAgICAgICAgIG1heFRpbWVvdXRJZCxcbiAgICAgICAgICAgIHJlc3VsdCxcbiAgICAgICAgICAgIHN0YW1wLFxuICAgICAgICAgICAgdGhpc0FyZyxcbiAgICAgICAgICAgIHRpbWVvdXRJZCxcbiAgICAgICAgICAgIHRyYWlsaW5nQ2FsbCxcbiAgICAgICAgICAgIGxhc3RDYWxsZWQgPSAwLFxuICAgICAgICAgICAgbWF4V2FpdCA9IGZhbHNlLFxuICAgICAgICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gICAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgICB9XG4gICAgd2FpdCA9IHdhaXQgPCAwID8gMCA6ICgrd2FpdCB8fCAwKTtcbiAgICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xuICAgICAgdHJhaWxpbmcgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgICBsZWFkaW5nID0gISFvcHRpb25zLmxlYWRpbmc7XG4gICAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgbmF0aXZlTWF4KCtvcHRpb25zLm1heFdhaXQgfHwgMCwgd2FpdCk7XG4gICAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/ICEhb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbmNlbCgpIHtcbiAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xuICAgICAgfVxuICAgICAgbGFzdENhbGxlZCA9IDA7XG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcGxldGUoaXNDYWxsZWQsIGlkKSB7XG4gICAgICBpZiAoaWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcbiAgICAgIH1cbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChpc0NhbGxlZCkge1xuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlbGF5ZWQoKSB7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XG4gICAgICAgIGNvbXBsZXRlKHRyYWlsaW5nQ2FsbCwgbWF4VGltZW91dElkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXhEZWxheWVkKCkge1xuICAgICAgY29tcGxldGUodHJhaWxpbmcsIHRpbWVvdXRJZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVib3VuY2VkKCkge1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHN0YW1wID0gbm93KCk7XG4gICAgICB0aGlzQXJnID0gdGhpcztcbiAgICAgIHRyYWlsaW5nQ2FsbCA9IHRyYWlsaW5nICYmICh0aW1lb3V0SWQgfHwgIWxlYWRpbmcpO1xuXG4gICAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcbiAgICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcbiAgICAgICAgICAgICAgICBpc0NhbGxlZCA9IHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IG1heFdhaXQ7XG5cbiAgICAgICAgaWYgKGlzQ2FsbGVkKSB7XG4gICAgICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xuICAgICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcbiAgICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcbiAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChsZWFkaW5nQ2FsbCkge1xuICAgICAgICBpc0NhbGxlZCA9IHRydWU7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICB9XG4gICAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBkZWJvdW5jZWQuY2FuY2VsID0gY2FuY2VsO1xuICAgIHJldHVybiBkZWJvdW5jZWQ7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIFtsYW5ndWFnZSB0eXBlXShodHRwczovL2VzNS5naXRodWIuaW8vI3g4KSBvZiBgT2JqZWN0YC5cbiAgICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gICAqXG4gICAqIEBzdGF0aWNcbiAgICogQG1lbWJlck9mIF9cbiAgICogQGNhdGVnb3J5IExhbmdcbiAgICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICAgKiBAZXhhbXBsZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KHt9KTtcbiAgICogLy8gPT4gdHJ1ZVxuICAgKlxuICAgKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gICAqIC8vID0+IHRydWVcbiAgICpcbiAgICogXy5pc09iamVjdCgxKTtcbiAgICogLy8gPT4gZmFsc2VcbiAgICovXG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gICAgLy8gQXZvaWQgYSBWOCBKSVQgYnVnIGluIENocm9tZSAxOS0yMC5cbiAgICAvLyBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTEgZm9yIG1vcmUgZGV0YWlscy5cbiAgICB2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgICByZXR1cm4gISF2YWx1ZSAmJiAodHlwZSA9PSAnb2JqZWN0JyB8fCB0eXBlID09ICdmdW5jdGlvbicpO1xuICB9XG5cbiAgcmV0dXJuIGRlYm91bmNlO1xuXG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlOyIsInZhciBkZWJvdW5jZTIgPSAoZnVuY3Rpb24gKCkge1xuICAvKipcbiAgICogU2xpZ2h0bHkgbW9kaWZpZWQgdmVyc2lvbiBvZiBkZWJvdW5jZS4gQ2FsbHMgZm4yIGF0IHRoZSBiZWdpbm5pbmcgb2YgZnJlcXVlbnQgY2FsbHMgdG8gZm4xXG4gICAqIEBzdGF0aWNcbiAgICogQGNhdGVnb3J5IEZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuMSBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBbd2FpdD0wXSBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm4yIFRoZSBmdW5jdGlvbiB0byBjYWxsIHRoZSBiZWdpbm5pbmcgb2YgZnJlcXVlbnQgY2FsbHMgdG8gZm4xXG4gICAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIGRlYm91bmNlMihmbjEsIHdhaXQsIGZuMikge1xuICAgIGxldCB0aW1lb3V0O1xuICAgIGxldCBpc0luaXQgPSB0cnVlO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGNvbnN0IGxhdGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgZm4xLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBpc0luaXQgPSB0cnVlO1xuICAgICAgfTtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIGlmIChpc0luaXQpIHtcbiAgICAgICAgZm4yLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBpc0luaXQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIHJldHVybiBkZWJvdW5jZTI7XG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlMjsiLCJmdW5jdGlvbiBlbGVtZW50VXRpbGl0aWVzKGN5KSB7XG4gcmV0dXJuIHtcbiAgbW92ZU5vZGVzOiBmdW5jdGlvbiAocG9zaXRpb25EaWZmLCBub2Rlcywgbm90Q2FsY1RvcE1vc3ROb2Rlcykge1xuICAgIHZhciB0b3BNb3N0Tm9kZXMgPSBub3RDYWxjVG9wTW9zdE5vZGVzID8gbm9kZXMgOiB0aGlzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XG4gICAgdmFyIG5vblBhcmVudHMgPSB0b3BNb3N0Tm9kZXMubm90KFwiOnBhcmVudFwiKTsgXG4gICAgLy8gbW92aW5nIHBhcmVudHMgc3BvaWxzIHBvc2l0aW9uaW5nLCBzbyBtb3ZlIG9ubHkgbm9ucGFyZW50c1xuICAgIG5vblBhcmVudHMucG9zaXRpb25zKGZ1bmN0aW9uKGVsZSwgaSl7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB4OiBub25QYXJlbnRzW2ldLnBvc2l0aW9uKFwieFwiKSArIHBvc2l0aW9uRGlmZi54LFxuICAgICAgICB5OiBub25QYXJlbnRzW2ldLnBvc2l0aW9uKFwieVwiKSArIHBvc2l0aW9uRGlmZi55XG4gICAgICB9O1xuICAgIH0pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9wTW9zdE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbm9kZSA9IHRvcE1vc3ROb2Rlc1tpXTtcbiAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4oKTtcbiAgICAgIHRoaXMubW92ZU5vZGVzKHBvc2l0aW9uRGlmZiwgY2hpbGRyZW4sIHRydWUpO1xuICAgIH1cbiAgfSxcbiAgZ2V0VG9wTW9zdE5vZGVzOiBmdW5jdGlvbiAobm9kZXMpIHsvLyovL1xuICAgIHZhciBub2Rlc01hcCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG5vZGVzTWFwW25vZGVzW2ldLmlkKCldID0gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIHJvb3RzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uIChlbGUsIGkpIHtcbiAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgZWxlID0gaTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgdmFyIHBhcmVudCA9IGVsZS5wYXJlbnQoKVswXTtcbiAgICAgIHdoaWxlIChwYXJlbnQgIT0gbnVsbCkge1xuICAgICAgICBpZiAobm9kZXNNYXBbcGFyZW50LmlkKCldKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnQoKVswXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJvb3RzO1xuICB9LFxuICByZWFycmFuZ2U6IGZ1bmN0aW9uIChsYXlvdXRCeSkge1xuICAgIGlmICh0eXBlb2YgbGF5b3V0QnkgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgbGF5b3V0QnkoKTtcbiAgICB9IGVsc2UgaWYgKGxheW91dEJ5ICE9IG51bGwpIHtcbiAgICAgIHZhciBsYXlvdXQgPSBjeS5sYXlvdXQobGF5b3V0QnkpO1xuICAgICAgaWYgKGxheW91dCAmJiBsYXlvdXQucnVuKSB7XG4gICAgICAgIGxheW91dC5ydW4oKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGNvbnZlcnRUb1JlbmRlcmVkUG9zaXRpb246IGZ1bmN0aW9uIChtb2RlbFBvc2l0aW9uKSB7XG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xuICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xuXG4gICAgdmFyIHggPSBtb2RlbFBvc2l0aW9uLnggKiB6b29tICsgcGFuLng7XG4gICAgdmFyIHkgPSBtb2RlbFBvc2l0aW9uLnkgKiB6b29tICsgcGFuLnk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgeDogeCxcbiAgICAgIHk6IHlcbiAgICB9O1xuICB9XG4gfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50VXRpbGl0aWVzO1xuIiwidmFyIGJvdW5kaW5nQm94VXRpbGl0aWVzID0gcmVxdWlyZSgnLi9ib3VuZGluZ0JveFV0aWxpdGllcycpO1xuXG4vLyBFeHBhbmQgY29sbGFwc2UgdXRpbGl0aWVzXG5mdW5jdGlvbiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcyhjeSkge1xudmFyIGVsZW1lbnRVdGlsaXRpZXMgPSByZXF1aXJlKCcuL2VsZW1lbnRVdGlsaXRpZXMnKShjeSk7XG5yZXR1cm4ge1xuICAvL3RoZSBudW1iZXIgb2Ygbm9kZXMgbW92aW5nIGFuaW1hdGVkbHkgYWZ0ZXIgZXhwYW5kIG9wZXJhdGlvblxuICBhbmltYXRlZGx5TW92aW5nTm9kZUNvdW50OiAwLFxuICAvKlxuICAgKiBBIGZ1bnRpb24gYmFzaWNseSBleHBhbmRpbmcgYSBub2RlLCBpdCBpcyB0byBiZSBjYWxsZWQgd2hlbiBhIG5vZGUgaXMgZXhwYW5kZWQgYW55d2F5LlxuICAgKiBTaW5nbGUgcGFyYW1ldGVyIGluZGljYXRlcyBpZiB0aGUgbm9kZSBpcyBleHBhbmRlZCBhbG9uZSBhbmQgaWYgaXQgaXMgdHJ1dGh5IHRoZW4gbGF5b3V0QnkgcGFyYW1ldGVyIGlzIGNvbnNpZGVyZWQgdG9cbiAgICogcGVyZm9ybSBsYXlvdXQgYWZ0ZXIgZXhwYW5kLlxuICAgKi9cbiAgZXhwYW5kTm9kZUJhc2VGdW5jdGlvbjogZnVuY3Rpb24gKG5vZGUsIHNpbmdsZSwgbGF5b3V0QnkpIHtcbiAgICBpZiAoIW5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbil7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy9jaGVjayBob3cgdGhlIHBvc2l0aW9uIG9mIHRoZSBub2RlIGlzIGNoYW5nZWRcbiAgICB2YXIgcG9zaXRpb25EaWZmID0ge1xuICAgICAgeDogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnXS54LFxuICAgICAgeTogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55IC0gbm9kZS5fcHJpdmF0ZS5kYXRhWydwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnXS55XG4gICAgfTtcblxuICAgIG5vZGUucmVtb3ZlRGF0YShcImluZm9MYWJlbFwiKTtcbiAgICBub2RlLnJlbW92ZUNsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGUnKTtcblxuICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmJlZm9yZWV4cGFuZFwiKTtcbiAgICB2YXIgcmVzdG9yZWROb2RlcyA9IGN5LmFkZChub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4uZmlsdGVyKGUgPT4gZS5ncm91cCA9PT0gXCJub2Rlc1wiKSlcbiAgICBjb25zb2xlLmxvZyhcInJlc3RvcmVkIG5vZGVzOlwiKVxuICAgIGNvbnNvbGUubG9nKHJlc3RvcmVkTm9kZXMuanNvbnMoKSk7XG4gICAgY3kuYWRkKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbi5maWx0ZXIoZSA9PiBlLmdyb3VwID09PSBcImVkZ2VzXCIpKVxuICAgIHZhciBwYXJlbnREYXRhID0gY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5wYXJlbnREYXRhO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCByZXN0b3JlZE5vZGVzLmxlbmd0aDsgaSsrKXtcbiAgICAgIGRlbGV0ZSBwYXJlbnREYXRhW3Jlc3RvcmVkTm9kZXNbaV0uaWQoKV07XG4gICAgfVxuICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YSA9IHBhcmVudERhdGE7XG4gICAgdGhpcy5yZXBhaXJFZGdlcyhub2RlKTtcbiAgICBub2RlLl9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4gPSBudWxsO1xuXG4gICAgZWxlbWVudFV0aWxpdGllcy5tb3ZlTm9kZXMocG9zaXRpb25EaWZmLCBub2RlLmNoaWxkcmVuKCkpO1xuICAgIG5vZGUucmVtb3ZlRGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJyk7XG5cbiAgICBub2RlLnRyaWdnZXIoXCJwb3NpdGlvblwiKTsgLy8gcG9zaXRpb24gbm90IHRyaWdnZXJlZCBieSBkZWZhdWx0IHdoZW4gbm9kZXMgYXJlIG1vdmVkXG4gICAgbm9kZS50cmlnZ2VyKFwiZXhwYW5kY29sbGFwc2UuYWZ0ZXJleHBhbmRcIik7XG5cbiAgICAvLyBJZiBleHBhbmQgaXMgY2FsbGVkIGp1c3QgZm9yIG9uZSBub2RlIHRoZW4gY2FsbCBlbmQgb3BlcmF0aW9uIHRvIHBlcmZvcm0gbGF5b3V0XG4gICAgaWYgKHNpbmdsZSkge1xuICAgICAgdGhpcy5lbmRPcGVyYXRpb24obGF5b3V0QnksIG5vZGUpO1xuICAgIH1cbiAgfSxcbiAgLypcbiAgICogQSBoZWxwZXIgZnVuY3Rpb24gdG8gY29sbGFwc2UgZ2l2ZW4gbm9kZXMgaW4gYSBzaW1wbGUgd2F5IChXaXRob3V0IHBlcmZvcm1pbmcgbGF5b3V0IGFmdGVyd2FyZClcbiAgICogSXQgY29sbGFwc2VzIGFsbCByb290IG5vZGVzIGJvdHRvbSB1cC5cbiAgICovXG4gIHNpbXBsZUNvbGxhcHNlR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzKSB7Ly8qLy9cbiAgICBjb25zb2xlLmxvZyhcInNpbXBsZSBjb2xsYXBzZVwiKTtcbiAgICBjb25zb2xlLmxvZyhub2Rlcy5qc29ucygpKVxuICAgIG5vZGVzLmRhdGEoXCJjb2xsYXBzZVwiLCB0cnVlKTtcbiAgICB2YXIgcm9vdHMgPSBlbGVtZW50VXRpbGl0aWVzLmdldFRvcE1vc3ROb2Rlcyhub2Rlcyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb290cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHJvb3QgPSByb290c1tpXTtcblxuICAgICAgLy8gQ29sbGFwc2UgdGhlIG5vZGVzIGluIGJvdHRvbSB1cCBvcmRlclxuICAgICAgdGhpcy5jb2xsYXBzZUJvdHRvbVVwKHJvb3QpO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlcztcbiAgfSxcbiAgLypcbiAgICogQSBoZWxwZXIgZnVuY3Rpb24gdG8gZXhwYW5kIGdpdmVuIG5vZGVzIGluIGEgc2ltcGxlIHdheSAoV2l0aG91dCBwZXJmb3JtaW5nIGxheW91dCBhZnRlcndhcmQpXG4gICAqIEl0IGV4cGFuZHMgYWxsIHRvcCBtb3N0IG5vZGVzIHRvcCBkb3duLlxuICAgKi9cbiAgc2ltcGxlRXhwYW5kR2l2ZW5Ob2RlczogZnVuY3Rpb24gKG5vZGVzLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xuICAgIG5vZGVzLmRhdGEoXCJleHBhbmRcIiwgdHJ1ZSk7IC8vIE1hcmsgdGhhdCB0aGUgbm9kZXMgYXJlIHN0aWxsIHRvIGJlIGV4cGFuZGVkXG4gICAgdmFyIHJvb3RzID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcm9vdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciByb290ID0gcm9vdHNbaV07XG4gICAgICB0aGlzLmV4cGFuZFRvcERvd24ocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpOyAvLyBGb3IgZWFjaCByb290IG5vZGUgZXhwYW5kIHRvcCBkb3duXG4gICAgfVxuICAgIHJldHVybiBub2RlcztcbiAgfSxcbiAgLypcbiAgICogRXhwYW5kcyBhbGwgbm9kZXMgYnkgZXhwYW5kaW5nIGFsbCB0b3AgbW9zdCBub2RlcyB0b3AgZG93biB3aXRoIHRoZWlyIGRlc2NlbmRhbnRzLlxuICAgKi9cbiAgc2ltcGxlRXhwYW5kQWxsTm9kZXM6IGZ1bmN0aW9uIChub2RlcywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcbiAgICBpZiAobm9kZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgbm9kZXMgPSBjeS5ub2RlcygpO1xuICAgIH1cbiAgICB2YXIgb3JwaGFucztcbiAgICBvcnBoYW5zID0gZWxlbWVudFV0aWxpdGllcy5nZXRUb3BNb3N0Tm9kZXMobm9kZXMpO1xuICAgIHZhciBleHBhbmRTdGFjayA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JwaGFucy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHJvb3QgPSBvcnBoYW5zW2ldO1xuICAgICAgdGhpcy5leHBhbmRBbGxUb3BEb3duKHJvb3QsIGV4cGFuZFN0YWNrLCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBleHBhbmRTdGFjaztcbiAgfSxcbiAgLypcbiAgICogVGhlIG9wZXJhdGlvbiB0byBiZSBwZXJmb3JtZWQgYWZ0ZXIgZXhwYW5kL2NvbGxhcHNlLiBJdCByZWFycmFuZ2Ugbm9kZXMgYnkgbGF5b3V0QnkgcGFyYW1ldGVyLlxuICAgKi9cbiAgZW5kT3BlcmF0aW9uOiBmdW5jdGlvbiAobGF5b3V0QnksIG5vZGVzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGN5LnJlYWR5KGZ1bmN0aW9uICgpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGVsZW1lbnRVdGlsaXRpZXMucmVhcnJhbmdlKGxheW91dEJ5KTtcbiAgICAgICAgaWYoY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5zZWxlY3RhYmxlQ2hhbmdlZCl7XG4gICAgICAgICAgbm9kZXMuc2VsZWN0aWZ5KCk7XG4gICAgICAgICAgY3kuc2NyYXRjaCgnX2N5RXhwYW5kQ29sbGFwc2UnKS5zZWxlY3RhYmxlQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9LCAwKTtcblxuICAgIH0pO1xuICB9LFxuICAvKlxuICAgKiBDYWxscyBzaW1wbGUgZXhwYW5kQWxsTm9kZXMuIFRoZW4gcGVyZm9ybXMgZW5kIG9wZXJhdGlvbi5cbiAgICovXG4gIGV4cGFuZEFsbE5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHsvLyovL1xuICAgIHZhciBleHBhbmRlZFN0YWNrID0gdGhpcy5zaW1wbGVFeHBhbmRBbGxOb2Rlcyhub2Rlcywgb3B0aW9ucy5maXNoZXllKTtcblxuICAgIHRoaXMuZW5kT3BlcmF0aW9uKG9wdGlvbnMubGF5b3V0QnksIG5vZGVzKTtcblxuICAgIC8qXG4gICAgICogcmV0dXJuIHRoZSBub2RlcyB0byB1bmRvIHRoZSBvcGVyYXRpb25cbiAgICAgKi9cbiAgICByZXR1cm4gZXhwYW5kZWRTdGFjaztcbiAgfSxcbiAgLypcbiAgICogRXhwYW5kcyB0aGUgcm9vdCBhbmQgaXRzIGNvbGxhcHNlZCBkZXNjZW5kZW50cyBpbiB0b3AgZG93biBvcmRlci5cbiAgICovXG4gIGV4cGFuZEFsbFRvcERvd246IGZ1bmN0aW9uIChyb290LCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpIHtcbiAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcbiAgICAgIGV4cGFuZFN0YWNrLnB1c2gocm9vdCk7XG4gICAgICB0aGlzLmV4cGFuZE5vZGUocm9vdCwgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xuICAgIH1cbiAgICB2YXIgY2hpbGRyZW4gPSByb290LmNoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSBjaGlsZHJlbltpXTtcbiAgICAgIHRoaXMuZXhwYW5kQWxsVG9wRG93bihub2RlLCBleHBhbmRTdGFjaywgYXBwbHlGaXNoRXllVmlld1RvRWFjaE5vZGUpO1xuICAgIH1cbiAgfSxcbiAgLy9FeHBhbmQgdGhlIGdpdmVuIG5vZGVzIHBlcmZvcm0gZW5kIG9wZXJhdGlvbiBhZnRlciBleHBhbmRhdGlvblxuICBleHBhbmRHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBqdXN0IG9uZSBub2RlIHRvIGV4cGFuZCB3ZSBuZWVkIHRvIGFuaW1hdGUgZm9yIGZpc2hleWUgdmlldywgYnV0IGlmIHRoZXJlIGFyZSBtb3JlIHRoZW4gb25lIG5vZGUgd2UgZG8gbm90XG4gICAgaWYgKG5vZGVzLmxlbmd0aCA9PT0gMSkge1xuXG4gICAgICB2YXIgbm9kZSA9IG5vZGVzWzBdO1xuICAgICAgaWYgKG5vZGUuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiAhPSBudWxsKSB7XG4gICAgICAgIC8vIEV4cGFuZCB0aGUgZ2l2ZW4gbm9kZSB0aGUgdGhpcmQgcGFyYW1ldGVyIGluZGljYXRlcyB0aGF0IHRoZSBub2RlIGlzIHNpbXBsZSB3aGljaCBlbnN1cmVzIHRoYXQgZmlzaGV5ZSBwYXJhbWV0ZXIgd2lsbCBiZSBjb25zaWRlcmVkXG4gICAgICAgIHRoaXMuZXhwYW5kTm9kZShub2RlLCBvcHRpb25zLmZpc2hleWUsIHRydWUsIG9wdGlvbnMuYW5pbWF0ZSwgb3B0aW9ucy5sYXlvdXRCeSwgb3B0aW9ucy5hbmltYXRpb25EdXJhdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gRmlyc3QgZXhwYW5kIGdpdmVuIG5vZGVzIGFuZCB0aGVuIHBlcmZvcm0gbGF5b3V0IGFjY29yZGluZyB0byB0aGUgbGF5b3V0QnkgcGFyYW1ldGVyXG4gICAgICB0aGlzLnNpbXBsZUV4cGFuZEdpdmVuTm9kZXMobm9kZXMsIG9wdGlvbnMuZmlzaGV5ZSk7XG4gICAgICB0aGlzLmVuZE9wZXJhdGlvbihvcHRpb25zLmxheW91dEJ5LCBub2Rlcyk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKiByZXR1cm4gdGhlIG5vZGVzIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAqL1xuICAgIHJldHVybiBub2RlcztcbiAgfSxcbiAgLy9jb2xsYXBzZSB0aGUgZ2l2ZW4gbm9kZXMgdGhlbiBwZXJmb3JtIGVuZCBvcGVyYXRpb25cbiAgY29sbGFwc2VHaXZlbk5vZGVzOiBmdW5jdGlvbiAobm9kZXMsIG9wdGlvbnMpIHtcbiAgICAvKlxuICAgICAqIEluIGNvbGxhcHNlIG9wZXJhdGlvbiB0aGVyZSBpcyBubyBmaXNoZXllIHZpZXcgdG8gYmUgYXBwbGllZCBzbyB0aGVyZSBpcyBubyBhbmltYXRpb24gdG8gYmUgZGVzdHJveWVkIGhlcmUuIFdlIGNhbiBkbyB0aGlzXG4gICAgICogaW4gYSBiYXRjaC5cbiAgICAgKi9cbiAgICBjeS5zdGFydEJhdGNoKCk7XG4gICAgdGhpcy5zaW1wbGVDb2xsYXBzZUdpdmVuTm9kZXMobm9kZXMvKiwgb3B0aW9ucyovKTtcbiAgICBjeS5lbmRCYXRjaCgpO1xuXG4gICAgbm9kZXMudHJpZ2dlcihcInBvc2l0aW9uXCIpOyAvLyBwb3NpdGlvbiBub3QgdHJpZ2dlcmVkIGJ5IGRlZmF1bHQgd2hlbiBjb2xsYXBzZU5vZGUgaXMgY2FsbGVkXG4gICAgdGhpcy5lbmRPcGVyYXRpb24ob3B0aW9ucy5sYXlvdXRCeSwgbm9kZXMpO1xuXG4gICAgLy8gVXBkYXRlIHRoZSBzdHlsZVxuICAgIGN5LnN0eWxlKCkudXBkYXRlKCk7XG5cbiAgICAvKlxuICAgICAqIHJldHVybiB0aGUgbm9kZXMgdG8gdW5kbyB0aGUgb3BlcmF0aW9uXG4gICAgICovXG4gICAgcmV0dXJuIG5vZGVzO1xuICB9LFxuICAvL2NvbGxhcHNlIHRoZSBub2RlcyBpbiBib3R0b20gdXAgb3JkZXIgc3RhcnRpbmcgZnJvbSB0aGUgcm9vdFxuICBjb2xsYXBzZUJvdHRvbVVwOiBmdW5jdGlvbiAocm9vdCkge1xuICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4oKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbm9kZSA9IGNoaWxkcmVuW2ldO1xuICAgICAgdGhpcy5jb2xsYXBzZUJvdHRvbVVwKG5vZGUpO1xuICAgIH1cbiAgICAvL0lmIHRoZSByb290IGlzIGEgY29tcG91bmQgbm9kZSB0byBiZSBjb2xsYXBzZWQgdGhlbiBjb2xsYXBzZSBpdFxuICAgIGlmIChyb290LmRhdGEoXCJjb2xsYXBzZVwiKSAmJiByb290LmNoaWxkcmVuKCkubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5jb2xsYXBzZU5vZGUocm9vdCk7XG4gICAgICByb290LnJlbW92ZURhdGEoXCJjb2xsYXBzZVwiKTtcbiAgICB9XG4gIH0sXG4gIC8vZXhwYW5kIHRoZSBub2RlcyBpbiB0b3AgZG93biBvcmRlciBzdGFydGluZyBmcm9tIHRoZSByb290XG4gIGV4cGFuZFRvcERvd246IGZ1bmN0aW9uIChyb290LCBhcHBseUZpc2hFeWVWaWV3VG9FYWNoTm9kZSkge1xuICAgIGlmIChyb290LmRhdGEoXCJleHBhbmRcIikgJiYgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcbiAgICAgIC8vIEV4cGFuZCB0aGUgcm9vdCBhbmQgdW5tYXJrIGl0cyBleHBhbmQgZGF0YSB0byBzcGVjaWZ5IHRoYXQgaXQgaXMgbm8gbW9yZSB0byBiZSBleHBhbmRlZFxuICAgICAgdGhpcy5leHBhbmROb2RlKHJvb3QsIGFwcGx5RmlzaEV5ZVZpZXdUb0VhY2hOb2RlKTtcbiAgICAgIHJvb3QucmVtb3ZlRGF0YShcImV4cGFuZFwiKTtcbiAgICB9XG4gICAgLy8gTWFrZSBhIHJlY3Vyc2l2ZSBjYWxsIGZvciBjaGlsZHJlbiBvZiByb290XG4gICAgdmFyIGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbigpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBub2RlID0gY2hpbGRyZW5baV07XG4gICAgICB0aGlzLmV4cGFuZFRvcERvd24obm9kZSk7XG4gICAgfVxuICB9LFxuICAvLyBDb252ZXJzdCB0aGUgcmVuZGVyZWQgcG9zaXRpb24gdG8gbW9kZWwgcG9zaXRpb24gYWNjb3JkaW5nIHRvIGdsb2JhbCBwYW4gYW5kIHpvb20gdmFsdWVzXG4gIGNvbnZlcnRUb01vZGVsUG9zaXRpb246IGZ1bmN0aW9uIChyZW5kZXJlZFBvc2l0aW9uKSB7XG4gICAgdmFyIHBhbiA9IGN5LnBhbigpO1xuICAgIHZhciB6b29tID0gY3kuem9vbSgpO1xuXG4gICAgdmFyIHggPSAocmVuZGVyZWRQb3NpdGlvbi54IC0gcGFuLngpIC8gem9vbTtcbiAgICB2YXIgeSA9IChyZW5kZXJlZFBvc2l0aW9uLnkgLSBwYW4ueSkgLyB6b29tO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5XG4gICAgfTtcbiAgfSxcbiAgLypcbiAgICogVGhpcyBtZXRob2QgZXhwYW5kcyB0aGUgZ2l2ZW4gbm9kZS4gSXQgY29uc2lkZXJzIGFwcGx5RmlzaEV5ZVZpZXcsIGFuaW1hdGUgYW5kIGxheW91dEJ5IHBhcmFtZXRlcnMuXG4gICAqIEl0IGFsc28gY29uc2lkZXJzIHNpbmdsZSBwYXJhbWV0ZXIgd2hpY2ggaW5kaWNhdGVzIGlmIHRoaXMgbm9kZSBpcyBleHBhbmRlZCBhbG9uZS4gSWYgdGhpcyBwYXJhbWV0ZXIgaXMgdHJ1dGh5IGFsb25nIHdpdGhcbiAgICogYXBwbHlGaXNoRXllVmlldyBwYXJhbWV0ZXIgdGhlbiB0aGUgc3RhdGUgb2YgdmlldyBwb3J0IGlzIHRvIGJlIGNoYW5nZWQgdG8gaGF2ZSBleHRyYSBzcGFjZSBvbiB0aGUgc2NyZWVuIChpZiBuZWVkZWQpIGJlZm9yZSBhcHBsaXlpbmcgdGhlXG4gICAqIGZpc2hleWUgdmlldy5cbiAgICovXG4gIGV4cGFuZE5vZGU6IGZ1bmN0aW9uIChub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBjb21tb25FeHBhbmRPcGVyYXRpb24gPSBmdW5jdGlvbiAobm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcbiAgICAgIGlmIChhcHBseUZpc2hFeWVWaWV3KSB7XG5cbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5fcHJpdmF0ZS5kYXRhWydzaXplLWJlZm9yZS1jb2xsYXBzZSddLnc7XG4gICAgICAgIG5vZGUuX3ByaXZhdGUuZGF0YVsnaGVpZ2h0LWJlZm9yZS1maXNoZXllJ10gPSBub2RlLl9wcml2YXRlLmRhdGFbJ3NpemUtYmVmb3JlLWNvbGxhcHNlJ10uaDtcblxuICAgICAgICAvLyBGaXNoZXllIHZpZXcgZXhwYW5kIHRoZSBub2RlLlxuICAgICAgICAvLyBUaGUgZmlyc3QgcGFyYW10ZXIgaW5kaWNhdGVzIHRoZSBub2RlIHRvIGFwcGx5IGZpc2hleWUgdmlldywgdGhlIHRoaXJkIHBhcmFtZXRlciBpbmRpY2F0ZXMgdGhlIG5vZGVcbiAgICAgICAgLy8gdG8gYmUgZXhwYW5kZWQgYWZ0ZXIgZmlzaGV5ZSB2aWV3IGlzIGFwcGxpZWQuXG4gICAgICAgIHNlbGYuZmlzaEV5ZVZpZXdFeHBhbmRHaXZlbk5vZGUobm9kZSwgc2luZ2xlLCBub2RlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBvbmUgb2YgdGhlc2UgcGFyYW1ldGVycyBpcyB0cnV0aHkgaXQgbWVhbnMgdGhhdCBleHBhbmROb2RlQmFzZUZ1bmN0aW9uIGlzIGFscmVhZHkgdG8gYmUgY2FsbGVkLlxuICAgICAgLy8gSG93ZXZlciBpZiBub25lIG9mIHRoZW0gaXMgdHJ1dGh5IHdlIG5lZWQgdG8gY2FsbCBpdCBoZXJlLlxuICAgICAgaWYgKCFzaW5nbGUgfHwgIWFwcGx5RmlzaEV5ZVZpZXcgfHwgIWFuaW1hdGUpIHtcbiAgICAgICAgc2VsZi5leHBhbmROb2RlQmFzZUZ1bmN0aW9uKG5vZGUsIHNpbmdsZSwgbGF5b3V0QnkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuICE9IG51bGwpIHtcbiAgICAgIHRoaXMuc3RvcmVXaWR0aEhlaWdodChub2RlKTtcbiAgICAgIHZhciBhbmltYXRpbmcgPSBmYWxzZTsgLy8gVmFyaWFibGUgdG8gY2hlY2sgaWYgdGhlcmUgaXMgYSBjdXJyZW50IGFuaW1hdGlvbiwgaWYgdGhlcmUgaXMgY29tbW9uRXhwYW5kT3BlcmF0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGFuaW1hdGlvblxuXG4gICAgICAvLyBJZiB0aGUgbm9kZSBpcyB0aGUgb25seSBub2RlIHRvIGV4cGFuZCBhbmQgZmlzaGV5ZSB2aWV3IHNob3VsZCBiZSBhcHBsaWVkLCB0aGVuIGNoYW5nZSB0aGUgc3RhdGUgb2Ygdmlld3BvcnRcbiAgICAgIC8vIHRvIGNyZWF0ZSBtb3JlIHNwYWNlIG9uIHNjcmVlbiAoSWYgbmVlZGVkKVxuICAgICAgaWYgKGFwcGx5RmlzaEV5ZVZpZXcgJiYgc2luZ2xlKSB7XG4gICAgICAgIHZhciB0b3BMZWZ0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IDAsIHk6IDB9KTtcbiAgICAgICAgdmFyIGJvdHRvbVJpZ2h0UG9zaXRpb24gPSB0aGlzLmNvbnZlcnRUb01vZGVsUG9zaXRpb24oe3g6IGN5LndpZHRoKCksIHk6IGN5LmhlaWdodCgpfSk7XG4gICAgICAgIHZhciBwYWRkaW5nID0gODA7XG4gICAgICAgIHZhciBiYiA9IHtcbiAgICAgICAgICB4MTogdG9wTGVmdFBvc2l0aW9uLngsXG4gICAgICAgICAgeDI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueCxcbiAgICAgICAgICB5MTogdG9wTGVmdFBvc2l0aW9uLnksXG4gICAgICAgICAgeTI6IGJvdHRvbVJpZ2h0UG9zaXRpb24ueVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBub2RlQkIgPSB7XG4gICAgICAgICAgeDE6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCAtIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS53IC8gMiAtIHBhZGRpbmcsXG4gICAgICAgICAgeDI6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueCArIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS53IC8gMiArIHBhZGRpbmcsXG4gICAgICAgICAgeTE6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSAtIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS5oIC8gMiAtIHBhZGRpbmcsXG4gICAgICAgICAgeTI6IG5vZGUuX3ByaXZhdGUucG9zaXRpb24ueSArIG5vZGUuX3ByaXZhdGUuZGF0YVsnc2l6ZS1iZWZvcmUtY29sbGFwc2UnXS5oIC8gMiArIHBhZGRpbmdcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdW5pb25CQiA9IGJvdW5kaW5nQm94VXRpbGl0aWVzLmdldFVuaW9uKG5vZGVCQiwgYmIpO1xuXG4gICAgICAgIC8vIElmIHRoZXNlIGJib3hlcyBhcmUgbm90IGVxdWFsIHRoZW4gd2UgbmVlZCB0byBjaGFuZ2UgdGhlIHZpZXdwb3J0IHN0YXRlIChieSBwYW4gYW5kIHpvb20pXG4gICAgICAgIGlmICghYm91bmRpbmdCb3hVdGlsaXRpZXMuZXF1YWxCb3VuZGluZ0JveGVzKHVuaW9uQkIsIGJiKSkge1xuICAgICAgICAgIHZhciB2aWV3UG9ydCA9IGN5LmdldEZpdFZpZXdwb3J0KHVuaW9uQkIsIDEwKTtcbiAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgYW5pbWF0aW5nID0gYW5pbWF0ZTsgLy8gU2lnbmFsIHRoYXQgdGhlcmUgaXMgYW4gYW5pbWF0aW9uIG5vdyBhbmQgY29tbW9uRXhwYW5kT3BlcmF0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGFuaW1hdGlvblxuICAgICAgICAgIC8vIENoZWNrIGlmIHdlIG5lZWQgdG8gYW5pbWF0ZSBkdXJpbmcgcGFuIGFuZCB6b29tXG4gICAgICAgICAgaWYgKGFuaW1hdGUpIHtcbiAgICAgICAgICAgIGN5LmFuaW1hdGUoe1xuICAgICAgICAgICAgICBwYW46IHZpZXdQb3J0LnBhbixcbiAgICAgICAgICAgICAgem9vbTogdmlld1BvcnQuem9vbSxcbiAgICAgICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb21tb25FeHBhbmRPcGVyYXRpb24obm9kZSwgYXBwbHlGaXNoRXllVmlldywgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgIGR1cmF0aW9uOiBhbmltYXRpb25EdXJhdGlvbiB8fCAxMDAwXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjeS56b29tKHZpZXdQb3J0Lnpvb20pO1xuICAgICAgICAgICAgY3kucGFuKHZpZXdQb3J0LnBhbik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIGFuaW1hdGluZyBpcyBub3QgdHJ1ZSB3ZSBuZWVkIHRvIGNhbGwgY29tbW9uRXhwYW5kT3BlcmF0aW9uIGhlcmVcbiAgICAgIGlmICghYW5pbWF0aW5nKSB7XG4gICAgICAgIGNvbW1vbkV4cGFuZE9wZXJhdGlvbihub2RlLCBhcHBseUZpc2hFeWVWaWV3LCBzaW5nbGUsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbik7XG4gICAgICB9XG5cbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICB9LFxuICAvL2NvbGxhcHNlIHRoZSBnaXZlbiBub2RlIHdpdGhvdXQgcGVyZm9ybWluZyBlbmQgb3BlcmF0aW9uXG4gIGNvbGxhcHNlTm9kZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcbiAgICAgIG5vZGUuZGF0YSgncG9zaXRpb24tYmVmb3JlLWNvbGxhcHNlJywge1xuICAgICAgICB4OiBub2RlLnBvc2l0aW9uKCkueCxcbiAgICAgICAgeTogbm9kZS5wb3NpdGlvbigpLnlcbiAgICAgIH0pO1xuXG4gICAgICBub2RlLmRhdGEoJ3NpemUtYmVmb3JlLWNvbGxhcHNlJywge1xuICAgICAgICB3OiBub2RlLm91dGVyV2lkdGgoKSxcbiAgICAgICAgaDogbm9kZS5vdXRlckhlaWdodCgpXG4gICAgICB9KTtcblxuICAgICAgdmFyIGNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbigpO1xuXG4gICAgICBjaGlsZHJlbi51bnNlbGVjdCgpO1xuICAgICAgY2hpbGRyZW4uY29ubmVjdGVkRWRnZXMoKS51bnNlbGVjdCgpO1xuXG4gICAgICBub2RlLnRyaWdnZXIoXCJleHBhbmRjb2xsYXBzZS5iZWZvcmVjb2xsYXBzZVwiKTtcblxuICAgICAgdGhpcy5iYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW4obm9kZSk7XG4gICAgICB0aGlzLnJlbW92ZUNoaWxkcmVuKG5vZGUsIG5vZGUpO1xuICAgICAgbm9kZS5hZGRDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJyk7XG5cbiAgICAgIG5vZGUudHJpZ2dlcihcImV4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2VcIik7XG5cbiAgICAgIG5vZGUucG9zaXRpb24obm9kZS5kYXRhKCdwb3NpdGlvbi1iZWZvcmUtY29sbGFwc2UnKSk7XG5cbiAgICAgIC8vcmV0dXJuIHRoZSBub2RlIHRvIHVuZG8gdGhlIG9wZXJhdGlvblxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICB9LFxuICBzdG9yZVdpZHRoSGVpZ2h0OiBmdW5jdGlvbiAobm9kZSkgey8vKi8vXG4gICAgaWYgKG5vZGUgIT0gbnVsbCkge1xuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd4LWJlZm9yZS1maXNoZXllJ10gPSB0aGlzLnhQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd5LWJlZm9yZS1maXNoZXllJ10gPSB0aGlzLnlQb3NpdGlvbkluUGFyZW50KG5vZGUpO1xuICAgICAgbm9kZS5fcHJpdmF0ZS5kYXRhWyd3aWR0aC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5vdXRlcldpZHRoKCk7XG4gICAgICBub2RlLl9wcml2YXRlLmRhdGFbJ2hlaWdodC1iZWZvcmUtZmlzaGV5ZSddID0gbm9kZS5vdXRlckhlaWdodCgpO1xuXG4gICAgICBpZiAobm9kZS5wYXJlbnQoKVswXSAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMuc3RvcmVXaWR0aEhlaWdodChub2RlLnBhcmVudCgpWzBdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgfSxcbiAgLypcbiAgICogQXBwbHkgZmlzaGV5ZSB2aWV3IHRvIHRoZSBnaXZlbiBub2RlLiBub2RlVG9FeHBhbmQgd2lsbCBiZSBleHBhbmRlZCBhZnRlciB0aGUgb3BlcmF0aW9uLlxuICAgKiBUaGUgb3RoZXIgcGFyYW1ldGVyIGFyZSB0byBiZSBwYXNzZWQgYnkgcGFyYW1ldGVycyBkaXJlY3RseSBpbiBpbnRlcm5hbCBmdW5jdGlvbiBjYWxscy5cbiAgICovXG4gIGZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlOiBmdW5jdGlvbiAobm9kZSwgc2luZ2xlLCBub2RlVG9FeHBhbmQsIGFuaW1hdGUsIGxheW91dEJ5LCBhbmltYXRpb25EdXJhdGlvbikge1xuICAgIHZhciBzaWJsaW5ncyA9IHRoaXMuZ2V0U2libGluZ3Mobm9kZSk7XG5cbiAgICB2YXIgeF9hID0gdGhpcy54UG9zaXRpb25JblBhcmVudChub2RlKTtcbiAgICB2YXIgeV9hID0gdGhpcy55UG9zaXRpb25JblBhcmVudChub2RlKTtcblxuICAgIHZhciBkX3hfbGVmdCA9IE1hdGguYWJzKChub2RlLl9wcml2YXRlLmRhdGFbJ3dpZHRoLWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVyV2lkdGgoKSkgLyAyKTtcbiAgICB2YXIgZF94X3JpZ2h0ID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnd2lkdGgtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJXaWR0aCgpKSAvIDIpO1xuICAgIHZhciBkX3lfdXBwZXIgPSBNYXRoLmFicygobm9kZS5fcHJpdmF0ZS5kYXRhWydoZWlnaHQtYmVmb3JlLWZpc2hleWUnXSAtIG5vZGUub3V0ZXJIZWlnaHQoKSkgLyAyKTtcbiAgICB2YXIgZF95X2xvd2VyID0gTWF0aC5hYnMoKG5vZGUuX3ByaXZhdGUuZGF0YVsnaGVpZ2h0LWJlZm9yZS1maXNoZXllJ10gLSBub2RlLm91dGVySGVpZ2h0KCkpIC8gMik7XG5cbiAgICB2YXIgYWJzX2RpZmZfb25feCA9IE1hdGguYWJzKG5vZGUuX3ByaXZhdGUuZGF0YVsneC1iZWZvcmUtZmlzaGV5ZSddIC0geF9hKTtcbiAgICB2YXIgYWJzX2RpZmZfb25feSA9IE1hdGguYWJzKG5vZGUuX3ByaXZhdGUuZGF0YVsneS1iZWZvcmUtZmlzaGV5ZSddIC0geV9hKTtcblxuICAgIC8vIENlbnRlciB3ZW50IHRvIExFRlRcbiAgICBpZiAobm9kZS5fcHJpdmF0ZS5kYXRhWyd4LWJlZm9yZS1maXNoZXllJ10gPiB4X2EpIHtcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgKyBhYnNfZGlmZl9vbl94O1xuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0IC0gYWJzX2RpZmZfb25feDtcbiAgICB9XG4gICAgLy8gQ2VudGVyIHdlbnQgdG8gUklHSFRcbiAgICBlbHNlIHtcbiAgICAgIGRfeF9sZWZ0ID0gZF94X2xlZnQgLSBhYnNfZGlmZl9vbl94O1xuICAgICAgZF94X3JpZ2h0ID0gZF94X3JpZ2h0ICsgYWJzX2RpZmZfb25feDtcbiAgICB9XG5cbiAgICAvLyBDZW50ZXIgd2VudCB0byBVUFxuICAgIGlmIChub2RlLl9wcml2YXRlLmRhdGFbJ3ktYmVmb3JlLWZpc2hleWUnXSA+IHlfYSkge1xuICAgICAgZF95X3VwcGVyID0gZF95X3VwcGVyICsgYWJzX2RpZmZfb25feTtcbiAgICAgIGRfeV9sb3dlciA9IGRfeV9sb3dlciAtIGFic19kaWZmX29uX3k7XG4gICAgfVxuICAgIC8vIENlbnRlciB3ZW50IHRvIERPV05cbiAgICBlbHNlIHtcbiAgICAgIGRfeV91cHBlciA9IGRfeV91cHBlciAtIGFic19kaWZmX29uX3k7XG4gICAgICBkX3lfbG93ZXIgPSBkX3lfbG93ZXIgKyBhYnNfZGlmZl9vbl95O1xuICAgIH1cblxuICAgIHZhciB4UG9zSW5QYXJlbnRTaWJsaW5nID0gW107XG4gICAgdmFyIHlQb3NJblBhcmVudFNpYmxpbmcgPSBbXTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHhQb3NJblBhcmVudFNpYmxpbmcucHVzaCh0aGlzLnhQb3NpdGlvbkluUGFyZW50KHNpYmxpbmdzW2ldKSk7XG4gICAgICB5UG9zSW5QYXJlbnRTaWJsaW5nLnB1c2godGhpcy55UG9zaXRpb25JblBhcmVudChzaWJsaW5nc1tpXSkpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2libGluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzaWJsaW5nID0gc2libGluZ3NbaV07XG5cbiAgICAgIHZhciB4X2IgPSB4UG9zSW5QYXJlbnRTaWJsaW5nW2ldO1xuICAgICAgdmFyIHlfYiA9IHlQb3NJblBhcmVudFNpYmxpbmdbaV07XG5cbiAgICAgIHZhciBzbG9wZSA9ICh5X2IgLSB5X2EpIC8gKHhfYiAtIHhfYSk7XG5cbiAgICAgIHZhciBkX3ggPSAwO1xuICAgICAgdmFyIGRfeSA9IDA7XG4gICAgICB2YXIgVF94ID0gMDtcbiAgICAgIHZhciBUX3kgPSAwO1xuXG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIExFRlRcbiAgICAgIGlmICh4X2EgPiB4X2IpIHtcbiAgICAgICAgZF94ID0gZF94X2xlZnQ7XG4gICAgICB9XG4gICAgICAvLyBDdXJyZW50IHNpYmxpbmcgaXMgb24gdGhlIFJJR0hUXG4gICAgICBlbHNlIHtcbiAgICAgICAgZF94ID0gZF94X3JpZ2h0O1xuICAgICAgfVxuICAgICAgLy8gQ3VycmVudCBzaWJsaW5nIGlzIG9uIHRoZSBVUFBFUiBzaWRlXG4gICAgICBpZiAoeV9hID4geV9iKSB7XG4gICAgICAgIGRfeSA9IGRfeV91cHBlcjtcbiAgICAgIH1cbiAgICAgIC8vIEN1cnJlbnQgc2libGluZyBpcyBvbiB0aGUgTE9XRVIgc2lkZVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRfeSA9IGRfeV9sb3dlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRmluaXRlKHNsb3BlKSkge1xuICAgICAgICBUX3ggPSBNYXRoLm1pbihkX3gsIChkX3kgLyBNYXRoLmFicyhzbG9wZSkpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNsb3BlICE9PSAwKSB7XG4gICAgICAgIFRfeSA9IE1hdGgubWluKGRfeSwgKGRfeCAqIE1hdGguYWJzKHNsb3BlKSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoeF9hID4geF9iKSB7XG4gICAgICAgIFRfeCA9IC0xICogVF94O1xuICAgICAgfVxuXG4gICAgICBpZiAoeV9hID4geV9iKSB7XG4gICAgICAgIFRfeSA9IC0xICogVF95O1xuICAgICAgfVxuXG4gICAgICAvLyBNb3ZlIHRoZSBzaWJsaW5nIGluIHRoZSBzcGVjaWFsIHdheVxuICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKHNpYmxpbmcsIFRfeCwgVF95LCBub2RlVG9FeHBhbmQsIHNpbmdsZSwgYW5pbWF0ZSwgbGF5b3V0QnksIGFuaW1hdGlvbkR1cmF0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyBzaWJsaW5nIGNhbGwgZXhwYW5kIG5vZGUgYmFzZSBmdW5jdGlvbiBoZXJlIGVsc2UgaXQgaXMgdG8gYmUgY2FsbGVkIG9uZSBvZiBmaXNoRXllVmlld01vdmVOb2RlKCkgY2FsbHNcbiAgICBpZiAoc2libGluZ3MubGVuZ3RoID09IDApIHtcbiAgICAgIHRoaXMuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZSwgbGF5b3V0QnkpO1xuICAgIH1cblxuICAgIGlmIChub2RlLnBhcmVudCgpWzBdICE9IG51bGwpIHtcbiAgICAgIC8vIEFwcGx5IGZpc2hleWUgdmlldyB0byB0aGUgcGFyZW50IG5vZGUgYXMgd2VsbCAoIElmIGV4aXN0cyApXG4gICAgICB0aGlzLmZpc2hFeWVWaWV3RXhwYW5kR2l2ZW5Ob2RlKG5vZGUucGFyZW50KClbMF0sIHNpbmdsZSwgbm9kZVRvRXhwYW5kLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlO1xuICB9LFxuICBnZXRTaWJsaW5nczogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICB2YXIgc2libGluZ3M7XG5cbiAgICBpZiAobm9kZS5wYXJlbnQoKVswXSA9PSBudWxsKSB7XG4gICAgICB2YXIgb3JwaGFucyA9IGN5Lm5vZGVzKFwiOnZpc2libGVcIikub3JwaGFucygpO1xuICAgICAgc2libGluZ3MgPSBvcnBoYW5zLmRpZmZlcmVuY2Uobm9kZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNpYmxpbmdzID0gbm9kZS5zaWJsaW5ncyhcIjp2aXNpYmxlXCIpO1xuICAgIH1cblxuICAgIHJldHVybiBzaWJsaW5ncztcbiAgfSxcbiAgLypcbiAgICogTW92ZSBub2RlIG9wZXJhdGlvbiBzcGVjaWFsaXplZCBmb3IgZmlzaCBleWUgdmlldyBleHBhbmQgb3BlcmF0aW9uXG4gICAqIE1vdmVzIHRoZSBub2RlIGJ5IG1vdmluZyBpdHMgZGVzY2FuZGVudHMuIE1vdmVtZW50IGlzIGFuaW1hdGVkIGlmIGJvdGggc2luZ2xlIGFuZCBhbmltYXRlIGZsYWdzIGFyZSB0cnV0aHkuXG4gICAqL1xuICBmaXNoRXllVmlld01vdmVOb2RlOiBmdW5jdGlvbiAobm9kZSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pIHtcbiAgICB2YXIgY2hpbGRyZW5MaXN0ID0gY3kuY29sbGVjdGlvbigpO1xuICAgIGlmKG5vZGUuaXNQYXJlbnQoKSl7XG4gICAgICAgY2hpbGRyZW5MaXN0ID0gbm9kZS5jaGlsZHJlbihcIjp2aXNpYmxlXCIpO1xuICAgIH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvKlxuICAgICAqIElmIHRoZSBub2RlIGlzIHNpbXBsZSBtb3ZlIGl0c2VsZiBkaXJlY3RseSBlbHNlIG1vdmUgaXQgYnkgbW92aW5nIGl0cyBjaGlsZHJlbiBieSBhIHNlbGYgcmVjdXJzaXZlIGNhbGxcbiAgICAgKi9cbiAgICBpZiAoY2hpbGRyZW5MaXN0Lmxlbmd0aCA9PSAwKSB7XG4gICAgICB2YXIgbmV3UG9zaXRpb24gPSB7eDogbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54ICsgVF94LCB5OiBub2RlLl9wcml2YXRlLnBvc2l0aW9uLnkgKyBUX3l9O1xuICAgICAgaWYgKCFzaW5nbGUgfHwgIWFuaW1hdGUpIHtcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi54ID0gbmV3UG9zaXRpb24ueDtcbiAgICAgICAgbm9kZS5fcHJpdmF0ZS5wb3NpdGlvbi55ID0gbmV3UG9zaXRpb24ueTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB0aGlzLmFuaW1hdGVkbHlNb3ZpbmdOb2RlQ291bnQrKztcbiAgICAgICAgbm9kZS5hbmltYXRlKHtcbiAgICAgICAgICBwb3NpdGlvbjogbmV3UG9zaXRpb24sXG4gICAgICAgICAgY29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudC0tO1xuICAgICAgICAgICAgaWYgKHNlbGYuYW5pbWF0ZWRseU1vdmluZ05vZGVDb3VudCA+IDAgfHwgIW5vZGVUb0V4cGFuZC5oYXNDbGFzcygnY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1ub2RlJykpIHtcblxuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIGFsbCBub2RlcyBhcmUgbW92ZWQgd2UgYXJlIHJlYWR5IHRvIGV4cGFuZCBzbyBjYWxsIGV4cGFuZCBub2RlIGJhc2UgZnVuY3Rpb25cbiAgICAgICAgICAgIHNlbGYuZXhwYW5kTm9kZUJhc2VGdW5jdGlvbihub2RlVG9FeHBhbmQsIHNpbmdsZSwgbGF5b3V0QnkpO1xuXG4gICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgZHVyYXRpb246IGFuaW1hdGlvbkR1cmF0aW9uIHx8IDEwMDBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbkxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5maXNoRXllVmlld01vdmVOb2RlKGNoaWxkcmVuTGlzdFtpXSwgVF94LCBUX3ksIG5vZGVUb0V4cGFuZCwgc2luZ2xlLCBhbmltYXRlLCBsYXlvdXRCeSwgYW5pbWF0aW9uRHVyYXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgeFBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcbiAgICB2YXIgeF9hID0gMC4wO1xuXG4gICAgLy8gR2l2ZW4gbm9kZSBpcyBub3QgYSBkaXJlY3QgY2hpbGQgb2YgdGhlIHRoZSByb290IGdyYXBoXG4gICAgaWYgKHBhcmVudCAhPSBudWxsKSB7XG4gICAgICB4X2EgPSBub2RlLnJlbGF0aXZlUG9zaXRpb24oJ3gnKSArIChwYXJlbnQud2lkdGgoKSAvIDIpO1xuICAgIH1cbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxuXG4gICAgZWxzZSB7XG4gICAgICB4X2EgPSBub2RlLnBvc2l0aW9uKCd4Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHhfYTtcbiAgfSxcbiAgeVBvc2l0aW9uSW5QYXJlbnQ6IGZ1bmN0aW9uIChub2RlKSB7Ly8qLy9cbiAgICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnQoKVswXTtcblxuICAgIHZhciB5X2EgPSAwLjA7XG5cbiAgICAvLyBHaXZlbiBub2RlIGlzIG5vdCBhIGRpcmVjdCBjaGlsZCBvZiB0aGUgdGhlIHJvb3QgZ3JhcGhcbiAgICBpZiAocGFyZW50ICE9IG51bGwpIHtcbiAgICAgIHlfYSA9IG5vZGUucmVsYXRpdmVQb3NpdGlvbigneScpICsgKHBhcmVudC5oZWlnaHQoKSAvIDIpO1xuICAgIH1cbiAgICAvLyBHaXZlbiBub2RlIGlzIGEgZGlyZWN0IGNoaWxkIG9mIHRoZSB0aGUgcm9vdCBncmFwaFxuXG4gICAgZWxzZSB7XG4gICAgICB5X2EgPSBub2RlLnBvc2l0aW9uKCd5Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHlfYTtcbiAgfSxcbiAgLypcbiAgICogZm9yIGFsbCBjaGlsZHJlbiBvZiB0aGUgbm9kZSBwYXJhbWV0ZXIgY2FsbCB0aGlzIG1ldGhvZFxuICAgKiB3aXRoIHRoZSBzYW1lIHJvb3QgcGFyYW1ldGVyLFxuICAgKiByZW1vdmUgdGhlIGNoaWxkIGFuZCBhZGQgdGhlIHJlbW92ZWQgY2hpbGQgdG8gdGhlIGNvbGxhcHNlZGNoaWxkcmVuIGRhdGFcbiAgICogb2YgdGhlIHJvb3QgdG8gcmVzdG9yZSB0aGVtIGluIHRoZSBjYXNlIG9mIGV4cGFuZGF0aW9uXG4gICAqIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiBrZWVwcyB0aGUgbm9kZXMgdG8gcmVzdG9yZSB3aGVuIHRoZVxuICAgKiByb290IGlzIGV4cGFuZGVkXG4gICAqL1xuICByZW1vdmVDaGlsZHJlbjogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc29sZS5sb2coXCJjdXJyZW50IGNoaWxkXCIpXG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICAgIGNvbnNvbGUubG9nKGNoaWxkLmlkKCkpXG4gICAgICBjb25zb2xlLmxvZyhjaGlsZC5qc29uKCkpXG4gICAgICBjb25zb2xlLmxvZyhjaGlsZC5qc29ucygpKVxuICAgICAgdGhpcy5yZW1vdmVDaGlsZHJlbihjaGlsZCwgcm9vdCk7XG4gICAgICB2YXIgcGFyZW50RGF0YSA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YTtcbiAgICAgIHBhcmVudERhdGFbY2hpbGQuaWQoKV0gPSBjaGlsZC5wYXJlbnQoKTtcbiAgICAgIGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YSA9IHBhcmVudERhdGE7XG4gICAgICB2YXIgcmVtb3ZlZENoaWxkID0gY2hpbGQucmVtb3ZlKCk7XG4gICAgICBpZiAocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJub2NoIG5peCBkcmluXCIpXG4gICAgICAgIHJvb3QuX3ByaXZhdGUuZGF0YS5jb2xsYXBzZWRDaGlsZHJlbiA9IHJlbW92ZWRDaGlsZC5qc29ucygpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImFiZXIgamV0enRcIilcbiAgICAgICAgY29uc29sZS5sb2cocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcImFscmVhZHkgZHJpbjpcIilcbiAgICAgICAgY29uc29sZS5sb2cocm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuKTtcbiAgICAgICAgcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuLmNvbmNhdChyZW1vdmVkQ2hpbGQuanNvbnMoKSk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZGFuYWNoOlwiKVxuICAgICAgICBjb25zb2xlLmxvZyhyb290Ll9wcml2YXRlLmRhdGEuY29sbGFwc2VkQ2hpbGRyZW4pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhcIlJlbW92aW5nIGNoaWxkcmVuIG9mIFwiICsgbm9kZS5pZCgpKVxuICAgIC8vIGNvbnN0IHJlbW92ZWQgPSBjaGlsZHJlbi5yZW1vdmUoKTtcbiAgICAvLyBjb25zb2xlLmxvZyhyZW1vdmVkLmpzb25zKCkpXG4gICAgLy8gcm9vdC5fcHJpdmF0ZS5kYXRhLmNvbGxhcHNlZENoaWxkcmVuID0gcmVtb3ZlZC5qc29ucygpO1xuICB9LFxuICBpc01ldGFFZGdlOiBmdW5jdGlvbihlZGdlKSB7XG4gICAgcmV0dXJuIGVkZ2UuaGFzQ2xhc3MoXCJjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlXCIpO1xuICB9LFxuICBiYXJyb3dFZGdlc09mY29sbGFwc2VkQ2hpbGRyZW46IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBjb25zb2xlLmxvZyhcIm5ldyB0YXJnZXQgXCIpXG4gICAgY29uc29sZS5sb2cobm9kZS5qc29uKCkpO1xuICAgIHZhciByZWxhdGVkTm9kZXMgPSBub2RlLmRlc2NlbmRhbnRzKCk7XG4gICAgdmFyIGVkZ2VzID0gcmVsYXRlZE5vZGVzLmVkZ2VzV2l0aChjeS5ub2RlcygpLm5vdChyZWxhdGVkTm9kZXMudW5pb24obm9kZSkpKTtcblxuICAgIHZhciByZWxhdGVkTm9kZU1hcCA9IHt9O1xuXG4gICAgcmVsYXRlZE5vZGVzLmVhY2goZnVuY3Rpb24oZWxlLCBpKSB7XG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGVsZSA9IGk7XG4gICAgICB9XG4gICAgICByZWxhdGVkTm9kZU1hcFtlbGUuaWQoKV0gPSB0cnVlO1xuICAgIH0pO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGVkZ2UgPSBlZGdlc1tpXTtcbiAgICAgIHZhciBzb3VyY2UgPSBlZGdlLnNvdXJjZSgpO1xuICAgICAgdmFyIHRhcmdldCA9IGVkZ2UudGFyZ2V0KCk7XG5cbiAgICAgIGNvbnNvbGUubG9nKFwib3JpZ2luYWwgdGFyZ2V0XCIpO1xuICAgICAgY29uc29sZS5sb2codGFyZ2V0Lmpzb24oKSk7XG5cbiAgICAgIGlmICghdGhpcy5pc01ldGFFZGdlKGVkZ2UpKSB7IC8vIGlzIG9yaWdpbmFsXG4gICAgICAgIGNvbnNvbGUubG9nKFwibWFjaHQgYXVjaCB3YXNcIilcbiAgICAgICAgdmFyIG9yaWdpbmFsRW5kc0RhdGEgPSB7XG4gICAgICAgICAgc291cmNlOiBzb3VyY2UuaWQoKSxcbiAgICAgICAgICB0YXJnZXQ6IHRhcmdldC5pZCgpXG4gICAgICAgIH07XG5cbiAgICAgICAgZWRnZS5hZGRDbGFzcyhcImN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2VcIik7XG4gICAgICAgIGVkZ2UuZGF0YSgnb3JpZ2luYWxFbmRzJywgb3JpZ2luYWxFbmRzRGF0YSk7XG4gICAgICB9XG5cbiAgICAgIGVkZ2UubW92ZSh7XG4gICAgICAgIHRhcmdldDogIXJlbGF0ZWROb2RlTWFwW3RhcmdldC5pZCgpXSA/IHRhcmdldC5pZCgpIDogbm9kZS5pZCgpLFxuICAgICAgICBzb3VyY2U6ICFyZWxhdGVkTm9kZU1hcFtzb3VyY2UuaWQoKV0gPyBzb3VyY2UuaWQoKSA6IG5vZGUuaWQoKVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBmaW5kTmV3RW5kOiBmdW5jdGlvbihub2RlSWQpIHtcbiAgICBjb25zb2xlLmxvZyhcImZpbmQgbmV3IGVuZCBmb3IgXCIpXG4gICAgY29uc29sZS5sb2cobm9kZUlkKTtcbiAgICB2YXIgY3VycmVudCA9IG5vZGVJZDtcbiAgICB2YXIgcGFyZW50RGF0YSA9IGN5LnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJykucGFyZW50RGF0YTtcbiAgICB2YXIgcGFyZW50ID0gcGFyZW50RGF0YVtjdXJyZW50XTtcblxuICAgIHdoaWxlKCAhY3kuZ2V0RWxlbWVudEJ5SWQobm9kZUlkKSApIHtcbiAgICAgIGN1cnJlbnQgPSBwYXJlbnQ7XG4gICAgICBwYXJlbnQgPSBwYXJlbnREYXRhW3BhcmVudC5pZCgpXTtcbiAgICB9XG5cbiAgICByZXR1cm4gY3VycmVudDtcbiAgfSxcbiAgcmVwYWlyRWRnZXM6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgY29ubmVjdGVkTWV0YUVkZ2VzID0gbm9kZS5jb25uZWN0ZWRFZGdlcygnLmN5LWV4cGFuZC1jb2xsYXBzZS1tZXRhLWVkZ2UnKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29ubmVjdGVkTWV0YUVkZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgZWRnZSA9IGNvbm5lY3RlZE1ldGFFZGdlc1tpXTtcbiAgICAgIHZhciBvcmlnaW5hbEVuZHMgPSBlZGdlLmRhdGEoJ29yaWdpbmFsRW5kcycpO1xuICAgICAgdmFyIGN1cnJlbnRTcmNJZCA9IGVkZ2UuZGF0YSgnc291cmNlJyk7XG4gICAgICB2YXIgY3VycmVudFRndElkID0gZWRnZS5kYXRhKCd0YXJnZXQnKTtcblxuICAgICAgY29uc29sZS5sb2coXCJzb3VyY2VcIik7XG4gICAgICBjb25zb2xlLmxvZyhvcmlnaW5hbEVuZHMuc291cmNlKTtcbiAgICAgIGNvbnNvbGUubG9nKFwidGFyZ2V0XCIpO1xuICAgICAgY29uc29sZS5sb2cob3JpZ2luYWxFbmRzLnRhcmdldCk7XG5cbiAgICAgIGlmICggY3VycmVudFNyY0lkID09PSBub2RlLmlkKCkgKSB7XG4gICAgICAgIGVkZ2UgPSBlZGdlLm1vdmUoe1xuICAgICAgICAgIHNvdXJjZTogdGhpcy5maW5kTmV3RW5kKG9yaWdpbmFsRW5kcy5zb3VyY2UpXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWRnZSA9IGVkZ2UubW92ZSh7XG4gICAgICAgICAgdGFyZ2V0OiB0aGlzLmZpbmROZXdFbmQob3JpZ2luYWxFbmRzLnRhcmdldClcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICggZWRnZS5kYXRhKCdzb3VyY2UnKSA9PT0gb3JpZ2luYWxFbmRzLnNvdXJjZSAmJiBlZGdlLmRhdGEoJ3RhcmdldCcpID09PSBvcmlnaW5hbEVuZHMudGFyZ2V0ICkge1xuICAgICAgICBlZGdlLnJlbW92ZUNsYXNzKCdjeS1leHBhbmQtY29sbGFwc2UtbWV0YS1lZGdlJyk7XG4gICAgICAgIGVkZ2UucmVtb3ZlRGF0YSgnb3JpZ2luYWxFbmRzJyk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICAvKm5vZGUgaXMgYW4gb3V0ZXIgbm9kZSBvZiByb290XG4gICBpZiByb290IGlzIG5vdCBpdCdzIGFuY2hlc3RvclxuICAgYW5kIGl0IGlzIG5vdCB0aGUgcm9vdCBpdHNlbGYqL1xuICBpc091dGVyTm9kZTogZnVuY3Rpb24gKG5vZGUsIHJvb3QpIHsvLyovL1xuICAgIHZhciB0ZW1wID0gbm9kZTtcbiAgICB3aGlsZSAodGVtcCAhPSBudWxsKSB7XG4gICAgICBpZiAodGVtcCA9PSByb290KSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHRlbXAgPSB0ZW1wLnBhcmVudCgpWzBdO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgLyoqXG4gICAqIEdldCBhbGwgY29sbGFwc2VkIGNoaWxkcmVuIC0gaW5jbHVkaW5nIG5lc3RlZCBvbmVzXG4gICAqIEBwYXJhbSBub2RlIDogYSBjb2xsYXBzZWQgbm9kZVxuICAgKiBAcGFyYW0gY29sbGFwc2VkQ2hpbGRyZW4gOiBhIGNvbGxlY3Rpb24gdG8gc3RvcmUgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJuIDogY29sbGFwc2VkIGNoaWxkcmVuXG4gICAqL1xuICBnZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5OiBmdW5jdGlvbihub2RlLCBjb2xsYXBzZWRDaGlsZHJlbil7XG4gICAgdmFyIGNoaWxkcmVuID0gbm9kZS5kYXRhKCdjb2xsYXBzZWRDaGlsZHJlbicpIHx8IFtdO1xuICAgIHZhciBpO1xuICAgIGZvciAoaT0wOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspe1xuICAgICAgaWYgKGNoaWxkcmVuW2ldLmRhdGEoJ2NvbGxhcHNlZENoaWxkcmVuJykpe1xuICAgICAgICBjb2xsYXBzZWRDaGlsZHJlbiA9IGNvbGxhcHNlZENoaWxkcmVuLnVuaW9uKHRoaXMuZ2V0Q29sbGFwc2VkQ2hpbGRyZW5SZWN1cnNpdmVseShjaGlsZHJlbltpXSwgY29sbGFwc2VkQ2hpbGRyZW4pKTtcbiAgICAgIH1cbiAgICAgIGNvbGxhcHNlZENoaWxkcmVuID0gY29sbGFwc2VkQ2hpbGRyZW4udW5pb24oY2hpbGRyZW5baV0pO1xuICAgIH1cbiAgICByZXR1cm4gY29sbGFwc2VkQ2hpbGRyZW47XG4gIH0sXG4gIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIHN0YXJ0IHNlY3Rpb24gZWRnZSBleHBhbmQgY29sbGFwc2UgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbiAgY29sbGFwc2VHaXZlbkVkZ2VzOiBmdW5jdGlvbiAoZWRnZXMsIG9wdGlvbnMpIHtcbiAgICBlZGdlcy51bnNlbGVjdCgpO1xuICAgIHZhciBub2RlcyA9IGVkZ2VzLmNvbm5lY3RlZE5vZGVzKCk7XG4gICAgdmFyIGVkZ2VzVG9Db2xsYXBzZSA9IHt9O1xuICAgIC8vIGdyb3VwIGVkZ2VzIGJ5IHR5cGUgaWYgdGhpcyBvcHRpb24gaXMgc2V0IHRvIHRydWVcbiAgICBpZiAob3B0aW9ucy5ncm91cEVkZ2VzT2ZTYW1lVHlwZU9uQ29sbGFwc2UpIHtcbiAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24gKGVkZ2UpIHtcbiAgICAgICAgdmFyIGVkZ2VUeXBlID0gXCJ1bmtub3duXCI7XG4gICAgICAgIGlmIChvcHRpb25zLmVkZ2VUeXBlSW5mbyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZWRnZVR5cGUgPSBvcHRpb25zLmVkZ2VUeXBlSW5mbyBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gb3B0aW9ucy5lZGdlVHlwZUluZm8uY2FsbChlZGdlKSA6IGVkZ2UuZGF0YSgpW29wdGlvbnMuZWRnZVR5cGVJbmZvXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWRnZXNUb0NvbGxhcHNlLmhhc093blByb3BlcnR5KGVkZ2VUeXBlKSkge1xuICAgICAgICAgIGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uZWRnZXMgPSBlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLmVkZ2VzLmFkZChlZGdlKTtcblxuICAgICAgICAgIGlmIChlZGdlc1RvQ29sbGFwc2VbZWRnZVR5cGVdLmRpcmVjdGlvblR5cGUgPT0gXCJ1bmlkaXJlY3Rpb25cIiAmJiAoZWRnZXNUb0NvbGxhcHNlW2VkZ2VUeXBlXS5zb3VyY2UgIT0gZWRnZS5zb3VyY2UoKS5pZCgpIHx8IGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0udGFyZ2V0ICE9IGVkZ2UudGFyZ2V0KCkuaWQoKSkpIHtcbiAgICAgICAgICAgIGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0uZGlyZWN0aW9uVHlwZSA9IFwiYmlkaXJlY3Rpb25cIjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGVkZ2VzWCA9IGN5LmNvbGxlY3Rpb24oKTtcbiAgICAgICAgICBlZGdlc1ggPSBlZGdlc1guYWRkKGVkZ2UpO1xuICAgICAgICAgIGVkZ2VzVG9Db2xsYXBzZVtlZGdlVHlwZV0gPSB7IGVkZ2VzOiBlZGdlc1gsIGRpcmVjdGlvblR5cGU6IFwidW5pZGlyZWN0aW9uXCIsIHNvdXJjZTogZWRnZS5zb3VyY2UoKS5pZCgpLCB0YXJnZXQ6IGVkZ2UudGFyZ2V0KCkuaWQoKSB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBlZGdlc1RvQ29sbGFwc2VbXCJ1bmtub3duXCJdID0geyBlZGdlczogZWRnZXMsIGRpcmVjdGlvblR5cGU6IFwidW5pZGlyZWN0aW9uXCIsIHNvdXJjZTogZWRnZXNbMF0uc291cmNlKCkuaWQoKSwgdGFyZ2V0OiBlZGdlc1swXS50YXJnZXQoKS5pZCgpIH1cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0uZGlyZWN0aW9uVHlwZSA9PSBcInVuaWRpcmVjdGlvblwiICYmIChlZGdlc1RvQ29sbGFwc2VbXCJ1bmtub3duXCJdLnNvdXJjZSAhPSBlZGdlc1tpXS5zb3VyY2UoKS5pZCgpIHx8IGVkZ2VzVG9Db2xsYXBzZVtcInVua25vd25cIl0udGFyZ2V0ICE9IGVkZ2VzW2ldLnRhcmdldCgpLmlkKCkpKSB7XG4gICAgICAgICAgZWRnZXNUb0NvbGxhcHNlW1widW5rbm93blwiXS5kaXJlY3Rpb25UeXBlID0gXCJiaWRpcmVjdGlvblwiO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdCA9IHsgZWRnZXM6IGN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXM6IGN5LmNvbGxlY3Rpb24oKSB9XG4gICAgdmFyIG5ld0VkZ2VzID0gW107XG4gICAgZm9yIChjb25zdCBlZGdlR3JvdXBUeXBlIGluIGVkZ2VzVG9Db2xsYXBzZSkge1xuICAgICAgaWYgKGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5lZGdlcy5sZW5ndGggPCAyKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZWRnZXMudHJpZ2dlcignZXhwYW5kY29sbGFwc2UuYmVmb3JlY29sbGFwc2VlZGdlJyk7XG4gICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5lZGdlcyk7XG4gICAgICB2YXIgbmV3RWRnZSA9IHt9O1xuICAgICAgbmV3RWRnZS5ncm91cCA9IFwiZWRnZXNcIjtcbiAgICAgIG5ld0VkZ2UuZGF0YSA9IHt9O1xuICAgICAgbmV3RWRnZS5kYXRhLnNvdXJjZSA9IGVkZ2VzVG9Db2xsYXBzZVtlZGdlR3JvdXBUeXBlXS5zb3VyY2U7XG4gICAgICBuZXdFZGdlLmRhdGEudGFyZ2V0ID0gZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLnRhcmdldDtcbiAgICAgIG5ld0VkZ2UuZGF0YS5pZCA9IFwiY29sbGFwc2VkRWRnZV9cIiArIG5vZGVzWzBdLmlkKCkgKyBcIl9cIiArIG5vZGVzWzFdLmlkKCkgKyBcIl9cIiArIGVkZ2VHcm91cFR5cGUgKyBcIl9cIiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIERhdGUubm93KCkpO1xuICAgICAgbmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzID0gY3kuY29sbGVjdGlvbigpO1xuXG4gICAgICBlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0uZWRnZXMuZm9yRWFjaChmdW5jdGlvbiAoZWRnZSkge1xuICAgICAgICBuZXdFZGdlLmRhdGEuY29sbGFwc2VkRWRnZXMgPSBuZXdFZGdlLmRhdGEuY29sbGFwc2VkRWRnZXMuYWRkKGVkZ2UpO1xuICAgICAgfSk7XG5cbiAgICAgIG5ld0VkZ2UuZGF0YS5jb2xsYXBzZWRFZGdlcyA9IHRoaXMuY2hlY2s0bmVzdGVkQ29sbGFwc2UobmV3RWRnZS5kYXRhLmNvbGxhcHNlZEVkZ2VzLCBvcHRpb25zKTtcblxuICAgICAgdmFyIGVkZ2VzVHlwZUZpZWxkID0gXCJlZGdlVHlwZVwiO1xuICAgICAgaWYgKG9wdGlvbnMuZWRnZVR5cGVJbmZvICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZWRnZXNUeXBlRmllbGQgPSBvcHRpb25zLmVkZ2VUeXBlSW5mbyBpbnN0YW5jZW9mIEZ1bmN0aW9uID8gZWRnZVR5cGVGaWVsZCA6IG9wdGlvbnMuZWRnZVR5cGVJbmZvO1xuICAgICAgfVxuICAgICAgbmV3RWRnZS5kYXRhW2VkZ2VzVHlwZUZpZWxkXSA9IGVkZ2VHcm91cFR5cGU7XG5cbiAgICAgIG5ld0VkZ2UuZGF0YVtcImRpcmVjdGlvblR5cGVcIl0gPSBlZGdlc1RvQ29sbGFwc2VbZWRnZUdyb3VwVHlwZV0uZGlyZWN0aW9uVHlwZTtcbiAgICAgIG5ld0VkZ2UuY2xhc3NlcyA9IFwiY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1lZGdlXCI7XG5cbiAgICAgIG5ld0VkZ2VzLnB1c2gobmV3RWRnZSk7XG4gICAgICBjeS5yZW1vdmUoZWRnZXNUb0NvbGxhcHNlW2VkZ2VHcm91cFR5cGVdLmVkZ2VzKTtcbiAgICAgIGVkZ2VzLnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmFmdGVyY29sbGFwc2VlZGdlJyk7XG4gICAgfVxuXG4gICAgcmVzdWx0LmVkZ2VzID0gY3kuYWRkKG5ld0VkZ2VzKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG4gIGNoZWNrNG5lc3RlZENvbGxhcHNlOiBmdW5jdGlvbihlZGdlczJjb2xsYXBzZSwgb3B0aW9ucyl7XG4gICAgaWYgKG9wdGlvbnMuYWxsb3dOZXN0ZWRFZGdlQ29sbGFwc2UpIHtcbiAgICAgIHJldHVybiBlZGdlczJjb2xsYXBzZTtcbiAgICB9XG4gICAgbGV0IHIgPSBjeS5jb2xsZWN0aW9uKCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBlZGdlczJjb2xsYXBzZS5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGN1cnIgPSBlZGdlczJjb2xsYXBzZVtpXTtcbiAgICAgIGxldCBjb2xsYXBzZWRFZGdlcyA9IGN1cnIuZGF0YSgnY29sbGFwc2VkRWRnZXMnKTtcbiAgICAgIGlmIChjb2xsYXBzZWRFZGdlcyAmJiBjb2xsYXBzZWRFZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHIgPSByLmFkZChjb2xsYXBzZWRFZGdlcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByID0gci5hZGQoY3Vycik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByO1xuICB9LFxuXG4gIGV4cGFuZEVkZ2U6IGZ1bmN0aW9uIChlZGdlKSB7XG4gICAgZWRnZS51bnNlbGVjdCgpO1xuICAgIHZhciByZXN1bHQgPSB7IGVkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCkgfVxuICAgIHZhciBlZGdlcyA9IGVkZ2UuZGF0YSgnY29sbGFwc2VkRWRnZXMnKTtcbiAgICBpZiAoZWRnZXMgIT09IHVuZGVmaW5lZCAmJiBlZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgICBlZGdlLnRyaWdnZXIoJ2V4cGFuZGNvbGxhcHNlLmJlZm9yZWV4cGFuZGVkZ2UnKTtcbiAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQoZWRnZSk7XG4gICAgICBjeS5yZW1vdmUoZWRnZSk7XG4gICAgICByZXN1bHQuZWRnZXMgPSBjeS5hZGQoZWRnZXMpO1xuICAgICAgZWRnZS50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5hZnRlcmV4cGFuZGVkZ2UnKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICAvL2lmIHRoZSBlZGdlcyBhcmUgb25seSBiZXR3ZWVuIHR3byBub2RlcyAodmFsaWQgZm9yIGNvbGxwYXNpbmcpIHJldHVybnMgdGhlIHR3byBub2RlcyBlbHNlIGl0IHJldHVybnMgZmFsc2VcbiAgaXNWYWxpZEVkZ2VzRm9yQ29sbGFwc2U6IGZ1bmN0aW9uIChlZGdlcykge1xuICAgIHZhciBlbmRQb2ludHMgPSB0aGlzLmdldEVkZ2VzRGlzdGluY3RFbmRQb2ludHMoZWRnZXMpO1xuICAgIGlmIChlbmRQb2ludHMubGVuZ3RoICE9IDIpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGVuZFBvaW50cztcbiAgICB9XG4gIH0sXG5cbiAgLy9yZXR1cm5zIGEgbGlzdCBvZiBkaXN0aW5jdCBlbmRwb2ludHMgb2YgYSBzZXQgb2YgZWRnZXMuXG4gIGdldEVkZ2VzRGlzdGluY3RFbmRQb2ludHM6IGZ1bmN0aW9uIChlZGdlcykge1xuICAgIHZhciBlbmRQb2ludHMgPSBbXTtcbiAgICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uIChlZGdlKSB7XG4gICAgICBpZiAoIXRoaXMuY29udGFpbnNFbGVtZW50KGVuZFBvaW50cywgZWRnZS5zb3VyY2UoKSkpIHtcbiAgICAgICAgZW5kUG9pbnRzLnB1c2goZWRnZS5zb3VyY2UoKSk7XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuY29udGFpbnNFbGVtZW50KGVuZFBvaW50cywgZWRnZS50YXJnZXQoKSkpIHtcbiAgICAgICAgZW5kUG9pbnRzLnB1c2goZWRnZS50YXJnZXQoKSk7XG5cbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgcmV0dXJuIGVuZFBvaW50cztcbiAgfSxcblxuICAvL2Z1bmN0aW9uIHRvIGNoZWNrIGlmIGEgbGlzdCBvZiBlbGVtZW50cyBjb250YWlucyB0aGUgZ2l2ZW4gZWxlbWVudCBieSBsb29raW5nIGF0IGlkKClcbiAgY29udGFpbnNFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudHMsIGVsZW1lbnQpIHtcbiAgICB2YXIgZXhpc3RzID0gZmFsc2U7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGVsZW1lbnRzW2ldLmlkKCkgPT0gZWxlbWVudC5pZCgpKSB7XG4gICAgICAgIGV4aXN0cyA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZXhpc3RzO1xuICB9XG4gIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGVuZCBzZWN0aW9uIGVkZ2UgZXhwYW5kIGNvbGxhcHNlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG59XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXM7XG4iLCI7XG4oZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gcmVnaXN0ZXJzIHRoZSBleHRlbnNpb24gb24gYSBjeXRvc2NhcGUgbGliIHJlZlxuICB2YXIgcmVnaXN0ZXIgPSBmdW5jdGlvbiAoY3l0b3NjYXBlKSB7XG5cbiAgICBpZiAoIWN5dG9zY2FwZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gY2FuJ3QgcmVnaXN0ZXIgaWYgY3l0b3NjYXBlIHVuc3BlY2lmaWVkXG5cbiAgICB2YXIgdW5kb1JlZG9VdGlsaXRpZXMgPSByZXF1aXJlKCcuL3VuZG9SZWRvVXRpbGl0aWVzJyk7XG4gICAgdmFyIGN1ZVV0aWxpdGllcyA9IHJlcXVpcmUoXCIuL2N1ZVV0aWxpdGllc1wiKTtcblxuICAgIGZ1bmN0aW9uIGV4dGVuZE9wdGlvbnMob3B0aW9ucywgZXh0ZW5kQnkpIHtcbiAgICAgIHZhciB0ZW1wT3B0cyA9IHt9O1xuICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpXG4gICAgICAgIHRlbXBPcHRzW2tleV0gPSBvcHRpb25zW2tleV07XG5cbiAgICAgIGZvciAodmFyIGtleSBpbiBleHRlbmRCeSlcbiAgICAgICAgaWYgKHRlbXBPcHRzLmhhc093blByb3BlcnR5KGtleSkpXG4gICAgICAgICAgdGVtcE9wdHNba2V5XSA9IGV4dGVuZEJ5W2tleV07XG4gICAgICByZXR1cm4gdGVtcE9wdHM7XG4gICAgfVxuXG4gICAgLy8gZXZhbHVhdGUgc29tZSBzcGVjaWZpYyBvcHRpb25zIGluIGNhc2Ugb2YgdGhleSBhcmUgc3BlY2lmaWVkIGFzIGZ1bmN0aW9ucyB0byBiZSBkeW5hbWljYWxseSBjaGFuZ2VkXG4gICAgZnVuY3Rpb24gZXZhbE9wdGlvbnMob3B0aW9ucykge1xuICAgICAgdmFyIGFuaW1hdGUgPSB0eXBlb2Ygb3B0aW9ucy5hbmltYXRlID09PSAnZnVuY3Rpb24nID8gb3B0aW9ucy5hbmltYXRlLmNhbGwoKSA6IG9wdGlvbnMuYW5pbWF0ZTtcbiAgICAgIHZhciBmaXNoZXllID0gdHlwZW9mIG9wdGlvbnMuZmlzaGV5ZSA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMuZmlzaGV5ZS5jYWxsKCkgOiBvcHRpb25zLmZpc2hleWU7XG5cbiAgICAgIG9wdGlvbnMuYW5pbWF0ZSA9IGFuaW1hdGU7XG4gICAgICBvcHRpb25zLmZpc2hleWUgPSBmaXNoZXllO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZXMgYW5kIHJldHVybnMgdGhlIEFQSSBpbnN0YW5jZSBmb3IgdGhlIGV4dGVuc2lvblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUV4dGVuc2lvbkFQSShjeSwgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMpIHtcbiAgICAgIHZhciBhcGkgPSB7fTsgLy8gQVBJIHRvIGJlIHJldHVybmVkXG4gICAgICAvLyBzZXQgZnVuY3Rpb25zXG5cbiAgICAgIGZ1bmN0aW9uIGhhbmRsZU5ld09wdGlvbnMoIG9wdHMgKSB7XG4gICAgICAgIHZhciBjdXJyZW50T3B0cyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIGlmICggb3B0cy5jdWVFbmFibGVkICYmICFjdXJyZW50T3B0cy5jdWVFbmFibGVkICkge1xuICAgICAgICAgIGFwaS5lbmFibGVDdWUoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICggIW9wdHMuY3VlRW5hYmxlZCAmJiBjdXJyZW50T3B0cy5jdWVFbmFibGVkICkge1xuICAgICAgICAgIGFwaS5kaXNhYmxlQ3VlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gc2V0IGFsbCBvcHRpb25zIGF0IG9uY2VcbiAgICAgIGFwaS5zZXRPcHRpb25zID0gZnVuY3Rpb24ob3B0cykge1xuICAgICAgICBoYW5kbGVOZXdPcHRpb25zKG9wdHMpO1xuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG9wdHMpO1xuICAgICAgfTtcblxuICAgICAgYXBpLmV4dGVuZE9wdGlvbnMgPSBmdW5jdGlvbihvcHRzKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIG5ld09wdGlvbnMgPSBleHRlbmRPcHRpb25zKCBvcHRpb25zLCBvcHRzICk7XG4gICAgICAgIGhhbmRsZU5ld09wdGlvbnMobmV3T3B0aW9ucyk7XG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdvcHRpb25zJywgbmV3T3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIC8vIHNldCB0aGUgb3B0aW9uIHdob3NlIG5hbWUgaXMgZ2l2ZW5cbiAgICAgIGFwaS5zZXRPcHRpb24gPSBmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIG9wdHMgPSB7fTtcbiAgICAgICAgb3B0c1sgbmFtZSBdID0gdmFsdWU7XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgbmV3T3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMoIG9wdGlvbnMsIG9wdHMgKTtcblxuICAgICAgICBoYW5kbGVOZXdPcHRpb25zKG5ld09wdGlvbnMpO1xuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG5ld09wdGlvbnMpO1xuICAgICAgfTtcblxuICAgICAgLy8gQ29sbGVjdGlvbiBmdW5jdGlvbnNcblxuICAgICAgLy8gY29sbGFwc2UgZ2l2ZW4gZWxlcyBleHRlbmQgb3B0aW9ucyB3aXRoIGdpdmVuIHBhcmFtXG4gICAgICBhcGkuY29sbGFwc2UgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcbiAgICAgICAgdmFyIGVsZXMgPSB0aGlzLmNvbGxhcHNpYmxlTm9kZXMoX2VsZXMpO1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuY29sbGFwc2VHaXZlbk5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGNvbGxhcHNlIGdpdmVuIGVsZXMgcmVjdXJzaXZlbHkgZXh0ZW5kIG9wdGlvbnMgd2l0aCBnaXZlbiBwYXJhbVxuICAgICAgYXBpLmNvbGxhcHNlUmVjdXJzaXZlbHkgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcbiAgICAgICAgdmFyIGVsZXMgPSB0aGlzLmNvbGxhcHNpYmxlTm9kZXMoX2VsZXMpO1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5jb2xsYXBzZShlbGVzLnVuaW9uKGVsZXMuZGVzY2VuZGFudHMoKSksIHRlbXBPcHRpb25zKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGV4cGFuZCBnaXZlbiBlbGVzIGV4dGVuZCBvcHRpb25zIHdpdGggZ2l2ZW4gcGFyYW1cbiAgICAgIGFwaS5leHBhbmQgPSBmdW5jdGlvbiAoX2VsZXMsIG9wdHMpIHtcbiAgICAgICAgdmFyIGVsZXMgPSB0aGlzLmV4cGFuZGFibGVOb2RlcyhfZWxlcyk7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xuXG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRHaXZlbk5vZGVzKGVsZXMsIHRlbXBPcHRpb25zKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGV4cGFuZCBnaXZlbiBlbGVzIHJlY3VzaXZlbHkgZXh0ZW5kIG9wdGlvbnMgd2l0aCBnaXZlbiBwYXJhbVxuICAgICAgYXBpLmV4cGFuZFJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24gKF9lbGVzLCBvcHRzKSB7XG4gICAgICAgIHZhciBlbGVzID0gdGhpcy5leHBhbmRhYmxlTm9kZXMoX2VsZXMpO1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIHZhciB0ZW1wT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG4gICAgICAgIGV2YWxPcHRpb25zKHRlbXBPcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kQWxsTm9kZXMoZWxlcywgdGVtcE9wdGlvbnMpO1xuICAgICAgfTtcblxuXG4gICAgICAvLyBDb3JlIGZ1bmN0aW9uc1xuXG4gICAgICAvLyBjb2xsYXBzZSBhbGwgY29sbGFwc2libGUgbm9kZXNcbiAgICAgIGFwaS5jb2xsYXBzZUFsbCA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmNvbGxhcHNlUmVjdXJzaXZlbHkodGhpcy5jb2xsYXBzaWJsZU5vZGVzKCksIHRlbXBPcHRpb25zKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGV4cGFuZCBhbGwgZXhwYW5kYWJsZSBub2Rlc1xuICAgICAgYXBpLmV4cGFuZEFsbCA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgZXZhbE9wdGlvbnModGVtcE9wdGlvbnMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmV4cGFuZFJlY3Vyc2l2ZWx5KHRoaXMuZXhwYW5kYWJsZU5vZGVzKCksIHRlbXBPcHRpb25zKTtcbiAgICAgIH07XG5cblxuICAgICAgLy8gVXRpbGl0eSBmdW5jdGlvbnNcblxuICAgICAgLy8gcmV0dXJucyBpZiB0aGUgZ2l2ZW4gbm9kZSBpcyBleHBhbmRhYmxlXG4gICAgICBhcGkuaXNFeHBhbmRhYmxlID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuaGFzQ2xhc3MoJ2N5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtbm9kZScpO1xuICAgICAgfTtcblxuICAgICAgLy8gcmV0dXJucyBpZiB0aGUgZ2l2ZW4gbm9kZSBpcyBjb2xsYXBzaWJsZVxuICAgICAgYXBpLmlzQ29sbGFwc2libGUgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICByZXR1cm4gIXRoaXMuaXNFeHBhbmRhYmxlKG5vZGUpICYmIG5vZGUuaXNQYXJlbnQoKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIGdldCBjb2xsYXBzaWJsZSBvbmVzIGluc2lkZSBnaXZlbiBub2RlcyBpZiBub2RlcyBwYXJhbWV0ZXIgaXMgbm90IHNwZWNpZmllZCBjb25zaWRlciBhbGwgbm9kZXNcbiAgICAgIGFwaS5jb2xsYXBzaWJsZU5vZGVzID0gZnVuY3Rpb24gKF9ub2Rlcykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBub2RlcyA9IF9ub2RlcyA/IF9ub2RlcyA6IGN5Lm5vZGVzKCk7XG4gICAgICAgIHJldHVybiBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKGVsZSwgaSkge1xuICAgICAgICAgIGlmKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIGVsZSA9IGk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZWxmLmlzQ29sbGFwc2libGUoZWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICAvLyBnZXQgZXhwYW5kYWJsZSBvbmVzIGluc2lkZSBnaXZlbiBub2RlcyBpZiBub2RlcyBwYXJhbWV0ZXIgaXMgbm90IHNwZWNpZmllZCBjb25zaWRlciBhbGwgbm9kZXNcbiAgICAgIGFwaS5leHBhbmRhYmxlTm9kZXMgPSBmdW5jdGlvbiAoX25vZGVzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIG5vZGVzID0gX25vZGVzID8gX25vZGVzIDogY3kubm9kZXMoKTtcbiAgICAgICAgcmV0dXJuIG5vZGVzLmZpbHRlcihmdW5jdGlvbiAoZWxlLCBpKSB7XG4gICAgICAgICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgZWxlID0gaTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHNlbGYuaXNFeHBhbmRhYmxlKGVsZSk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgLy8gR2V0IHRoZSBjaGlsZHJlbiBvZiB0aGUgZ2l2ZW4gY29sbGFwc2VkIG5vZGUgd2hpY2ggYXJlIHJlbW92ZWQgZHVyaW5nIGNvbGxhcHNlIG9wZXJhdGlvblxuICAgICAgYXBpLmdldENvbGxhcHNlZENoaWxkcmVuID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuZGF0YSgnY29sbGFwc2VkQ2hpbGRyZW4nKTtcbiAgICAgIH07XG5cbiAgICAgIC8qKiBHZXQgY29sbGFwc2VkIGNoaWxkcmVuIHJlY3Vyc2l2ZWx5IGluY2x1ZGluZyBuZXN0ZWQgY29sbGFwc2VkIGNoaWxkcmVuXG4gICAgICAgKiBSZXR1cm5lZCB2YWx1ZSBpbmNsdWRlcyBlZGdlcyBhbmQgbm9kZXMsIHVzZSBzZWxlY3RvciB0byBnZXQgZWRnZXMgb3Igbm9kZXNcbiAgICAgICAqIEBwYXJhbSBub2RlIDogYSBjb2xsYXBzZWQgbm9kZVxuICAgICAgICogQHJldHVybiBhbGwgY29sbGFwc2VkIGNoaWxkcmVuXG4gICAgICAgKi9cbiAgICAgIGFwaS5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24obm9kZSkge1xuICAgICAgICB2YXIgY29sbGFwc2VkQ2hpbGRyZW4gPSBjeS5jb2xsZWN0aW9uKCk7XG4gICAgICAgIHJldHVybiBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5KG5vZGUsIGNvbGxhcHNlZENoaWxkcmVuKTtcbiAgICAgIH07XG5cbiAgICAgIC8qKiBHZXQgY29sbGFwc2VkIGNoaWxkcmVuIG9mIGFsbCBjb2xsYXBzZWQgbm9kZXMgcmVjdXJzaXZlbHkgaW5jbHVkaW5nIG5lc3RlZCBjb2xsYXBzZWQgY2hpbGRyZW5cbiAgICAgICAqIFJldHVybmVkIHZhbHVlIGluY2x1ZGVzIGVkZ2VzIGFuZCBub2RlcywgdXNlIHNlbGVjdG9yIHRvIGdldCBlZGdlcyBvciBub2Rlc1xuICAgICAgICogQHJldHVybiBhbGwgY29sbGFwc2VkIGNoaWxkcmVuXG4gICAgICAgKi9cbiAgICAgIGFwaS5nZXRBbGxDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGNvbGxhcHNlZENoaWxkcmVuID0gY3kuY29sbGVjdGlvbigpO1xuICAgICAgICB2YXIgY29sbGFwc2VkTm9kZXMgPSBjeS5ub2RlcyhcIi5jeS1leHBhbmQtY29sbGFwc2UtY29sbGFwc2VkLW5vZGVcIik7XG4gICAgICAgIHZhciBqO1xuICAgICAgICBmb3IgKGo9MDsgaiA8IGNvbGxhcHNlZE5vZGVzLmxlbmd0aDsgaisrKXtcbiAgICAgICAgICAgIGNvbGxhcHNlZENoaWxkcmVuID0gY29sbGFwc2VkQ2hpbGRyZW4udW5pb24odGhpcy5nZXRDb2xsYXBzZWRDaGlsZHJlblJlY3Vyc2l2ZWx5KGNvbGxhcHNlZE5vZGVzW2pdKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbGxhcHNlZENoaWxkcmVuO1xuICAgICAgfTtcbiAgICAgIC8vIFRoaXMgbWV0aG9kIGZvcmNlcyB0aGUgdmlzdWFsIGN1ZSB0byBiZSBjbGVhcmVkLiBJdCBpcyB0byBiZSBjYWxsZWQgaW4gZXh0cmVtZSBjYXNlc1xuICAgICAgYXBpLmNsZWFyVmlzdWFsQ3VlID0gZnVuY3Rpb24obm9kZSkge1xuICAgICAgICBjeS50cmlnZ2VyKCdleHBhbmRjb2xsYXBzZS5jbGVhcnZpc3VhbGN1ZScpO1xuICAgICAgfTtcblxuICAgICAgYXBpLmRpc2FibGVDdWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICBpZiAob3B0aW9ucy5jdWVFbmFibGVkKSB7XG4gICAgICAgICAgY3VlVXRpbGl0aWVzKCd1bmJpbmQnLCBjeSwgYXBpKTtcbiAgICAgICAgICBvcHRpb25zLmN1ZUVuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgYXBpLmVuYWJsZUN1ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGdldFNjcmF0Y2goY3ksICdvcHRpb25zJyk7XG4gICAgICAgIGlmICghb3B0aW9ucy5jdWVFbmFibGVkKSB7XG4gICAgICAgICAgY3VlVXRpbGl0aWVzKCdyZWJpbmQnLCBjeSwgYXBpKTtcbiAgICAgICAgICBvcHRpb25zLmN1ZUVuYWJsZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBhcGkuZ2V0UGFyZW50ID0gZnVuY3Rpb24obm9kZUlkKSB7XG4gICAgICAgIGlmKGN5LmdldEVsZW1lbnRCeUlkKG5vZGVJZClbMF0gPT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgdmFyIHBhcmVudERhdGEgPSBnZXRTY3JhdGNoKGN5LCAncGFyZW50RGF0YScpO1xuICAgICAgICAgIHJldHVybiBwYXJlbnREYXRhW25vZGVJZF07XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICByZXR1cm4gY3kuZ2V0RWxlbWVudEJ5SWQobm9kZUlkKS5wYXJlbnQoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgYXBpLmNvbGxhcHNlRWRnZXMgPSBmdW5jdGlvbihlZGdlcyxvcHRzKXtcbiAgICAgICAgdmFyIHJlc3VsdCA9ICAgIHtlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpfTtcbiAgICAgICAgaWYoZWRnZXMubGVuZ3RoIDwgMikgcmV0dXJuIHJlc3VsdCA7XG4gICAgICAgIGlmKGVkZ2VzLmNvbm5lY3RlZE5vZGVzKCkubGVuZ3RoID4gMikgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpO1xuICAgICAgICB2YXIgdGVtcE9wdGlvbnMgPSBleHRlbmRPcHRpb25zKG9wdGlvbnMsIG9wdHMpO1xuICAgICAgICByZXR1cm4gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuY29sbGFwc2VHaXZlbkVkZ2VzKGVkZ2VzLCB0ZW1wT3B0aW9ucyk7XG4gICAgICB9O1xuICAgICAgYXBpLmV4cGFuZEVkZ2VzID0gZnVuY3Rpb24oZWRnZXMpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gICAge2VkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCl9XG4gICAgICAgIGlmKGVkZ2VzID09PSB1bmRlZmluZWQpIHJldHVybiByZXN1bHQ7XG5cbiAgICAgICAgLy9pZih0eXBlb2YgZWRnZXNbU3ltYm9sLml0ZXJhdG9yXSA9PT0gJ2Z1bmN0aW9uJyl7Ly9jb2xsZWN0aW9uIG9mIGVkZ2VzIGlzIHBhc3NlZFxuICAgICAgICAgIGVkZ2VzLmZvckVhY2goZnVuY3Rpb24oZWRnZSl7XG4gICAgICAgICAgICB2YXIgb3BlcmF0aW9uUmVzdWx0ID0gZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMuZXhwYW5kRWRnZShlZGdlKTtcbiAgICAgICAgICAgIHJlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0LmVkZ2VzKTtcbiAgICAgICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcblxuICAgICAgICAgIH0pO1xuICAgICAgIC8qICB9ZWxzZXsvL29uZSBlZGdlIHBhc3NlZFxuICAgICAgICAgIHZhciBvcGVyYXRpb25SZXN1bHQgPSBleHBhbmRDb2xsYXBzZVV0aWxpdGllcy5leHBhbmRFZGdlKGVkZ2VzKTtcbiAgICAgICAgICByZXN1bHQuZWRnZXMgPSByZXN1bHQuZWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5lZGdlcyk7XG4gICAgICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gcmVzdWx0Lm9sZEVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQub2xkRWRnZXMpO1xuXG4gICAgICAgIH0gKi9cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuXG4gICAgICB9O1xuICAgICAgYXBpLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMgPSBmdW5jdGlvbihub2Rlcywgb3B0cyl7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgZnVuY3Rpb24gcGFpcndpc2UobGlzdCkge1xuICAgICAgICAgIHZhciBwYWlycyA9IFtdO1xuICAgICAgICAgIGxpc3RcbiAgICAgICAgICAgIC5zbGljZSgwLCBsaXN0Lmxlbmd0aCAtIDEpXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoZmlyc3QsIG4pIHtcbiAgICAgICAgICAgICAgdmFyIHRhaWwgPSBsaXN0LnNsaWNlKG4gKyAxLCBsaXN0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgIHRhaWwuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goW2ZpcnN0LCBpdGVtXSlcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIHJldHVybiBwYWlycztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbm9kZXNQYWlycyA9IHBhaXJ3aXNlKG5vZGVzKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHtlZGdlczogY3kuY29sbGVjdGlvbigpLCBvbGRFZGdlczogY3kuY29sbGVjdGlvbigpfTtcbiAgICAgICAgbm9kZXNQYWlycy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGVQYWlyKXtcbiAgICAgICAgICB2YXIgZWRnZXMgPSBub2RlUGFpclswXS5jb25uZWN0ZWRFZGdlcygnW3NvdXJjZSA9IFwiJysgbm9kZVBhaXJbMV0uaWQoKSsnXCJdLFt0YXJnZXQgPSBcIicrIG5vZGVQYWlyWzFdLmlkKCkrJ1wiXScpO1xuXG4gICAgICAgICAgaWYoZWRnZXMubGVuZ3RoID49IDIpe1xuICAgICAgICAgICAgdmFyIG9wZXJhdGlvblJlc3VsdCA9IGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5FZGdlcyhlZGdlcywgdGVtcE9wdGlvbnMpXG4gICAgICAgICAgICByZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5vbGRFZGdlcyk7XG4gICAgICAgICAgICByZXN1bHQuZWRnZXMgPSByZXN1bHQuZWRnZXMuYWRkKG9wZXJhdGlvblJlc3VsdC5lZGdlcyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcblxuICAgICAgfTtcbiAgICAgIGFwaS5leHBhbmRFZGdlc0JldHdlZW5Ob2RlcyA9IGZ1bmN0aW9uKG5vZGVzKXtcbiAgICAgICAgaWYobm9kZXMubGVuZ3RoIDw9IDEpIGN5LmNvbGxlY3Rpb24oKTtcbiAgICAgICAgdmFyIGVkZ2VzVG9FeHBhbmQgPSBjeS5jb2xsZWN0aW9uKCk7XG4gICAgICAgIGZ1bmN0aW9uIHBhaXJ3aXNlKGxpc3QpIHtcbiAgICAgICAgICB2YXIgcGFpcnMgPSBbXTtcbiAgICAgICAgICBsaXN0XG4gICAgICAgICAgICAuc2xpY2UoMCwgbGlzdC5sZW5ndGggLSAxKVxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGZpcnN0LCBuKSB7XG4gICAgICAgICAgICAgIHZhciB0YWlsID0gbGlzdC5zbGljZShuICsgMSwgbGlzdC5sZW5ndGgpO1xuICAgICAgICAgICAgICB0YWlsLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBwYWlycy5wdXNoKFtmaXJzdCwgaXRlbV0pXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICByZXR1cm4gcGFpcnM7XG4gICAgICAgIH1cbiAgICAgICAgLy92YXIgcmVzdWx0ID0ge2VkZ2VzOiBjeS5jb2xsZWN0aW9uKCksIG9sZEVkZ2VzOiBjeS5jb2xsZWN0aW9uKCl9ICAgO1xuICAgICAgICB2YXIgbm9kZXNQYWlycyA9IHBhaXJ3aXNlKG5vZGVzKTtcbiAgICAgICAgbm9kZXNQYWlycy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGVQYWlyKXtcbiAgICAgICAgICB2YXIgZWRnZXMgPSBub2RlUGFpclswXS5jb25uZWN0ZWRFZGdlcygnLmN5LWV4cGFuZC1jb2xsYXBzZS1jb2xsYXBzZWQtZWRnZVtzb3VyY2UgPSBcIicrIG5vZGVQYWlyWzFdLmlkKCkrJ1wiXSxbdGFyZ2V0ID0gXCInKyBub2RlUGFpclsxXS5pZCgpKydcIl0nKTtcbiAgICAgICAgICBlZGdlc1RvRXhwYW5kID0gZWRnZXNUb0V4cGFuZC51bmlvbihlZGdlcyk7XG5cbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgLy9yZXN1bHQub2xkRWRnZXMgPSByZXN1bHQub2xkRWRnZXMuYWRkKGVkZ2VzVG9FeHBhbmQpO1xuICAgICAgICAvL3Jlc3VsdC5lZGdlcyA9IHJlc3VsdC5lZGdlcy5hZGQodGhpcy5leHBhbmRFZGdlcyhlZGdlc1RvRXhwYW5kKSk7XG4gICAgICAgIHJldHVybiB0aGlzLmV4cGFuZEVkZ2VzKGVkZ2VzVG9FeHBhbmQpO1xuICAgICAgfTtcbiAgICAgIGFwaS5jb2xsYXBzZUFsbEVkZ2VzID0gZnVuY3Rpb24ob3B0cyl7XG4gICAgICAgIHZhciBvcHRpb25zID0gZ2V0U2NyYXRjaChjeSwgJ29wdGlvbnMnKTtcbiAgICAgICAgdmFyIHRlbXBPcHRpb25zID0gZXh0ZW5kT3B0aW9ucyhvcHRpb25zLCBvcHRzKTtcbiAgICAgICAgZnVuY3Rpb24gcGFpcndpc2UobGlzdCkge1xuICAgICAgICAgIHZhciBwYWlycyA9IFtdO1xuICAgICAgICAgIGxpc3RcbiAgICAgICAgICAgIC5zbGljZSgwLCBsaXN0Lmxlbmd0aCAtIDEpXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbiAoZmlyc3QsIG4pIHtcbiAgICAgICAgICAgICAgdmFyIHRhaWwgPSBsaXN0LnNsaWNlKG4gKyAxLCBsaXN0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgIHRhaWwuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2goW2ZpcnN0LCBpdGVtXSlcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIHJldHVybiBwYWlycztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMoY3kuZWRnZXMoKS5jb25uZWN0ZWROb2RlcygpLG9wdHMpO1xuICAgICAgIC8qICB2YXIgbm9kZXNQYWlycyA9IHBhaXJ3aXNlKGN5LmVkZ2VzKCkuY29ubmVjdGVkTm9kZXMoKSk7XG4gICAgICAgIG5vZGVzUGFpcnMuZm9yRWFjaChmdW5jdGlvbihub2RlUGFpcil7XG4gICAgICAgICAgdmFyIGVkZ2VzID0gbm9kZVBhaXJbMF0uY29ubmVjdGVkRWRnZXMoJ1tzb3VyY2UgPSBcIicrIG5vZGVQYWlyWzFdLmlkKCkrJ1wiXSxbdGFyZ2V0ID0gXCInKyBub2RlUGFpclsxXS5pZCgpKydcIl0nKTtcbiAgICAgICAgICBpZihlZGdlcy5sZW5ndGggPj0yKXtcbiAgICAgICAgICAgIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzLmNvbGxhcHNlR2l2ZW5FZGdlcyhlZGdlcywgdGVtcE9wdGlvbnMpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9LmJpbmQodGhpcykpOyAqL1xuXG4gICAgICB9O1xuICAgICAgYXBpLmV4cGFuZEFsbEVkZ2VzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGVkZ2VzID0gY3kuZWRnZXMoXCIuY3ktZXhwYW5kLWNvbGxhcHNlLWNvbGxhcHNlZC1lZGdlXCIpO1xuICAgICAgICB2YXIgcmVzdWx0ID0ge2VkZ2VzOmN5LmNvbGxlY3Rpb24oKSwgb2xkRWRnZXMgOiBjeS5jb2xsZWN0aW9uKCl9O1xuICAgICAgICB2YXIgb3BlcmF0aW9uUmVzdWx0ID0gdGhpcy5leHBhbmRFZGdlcyhlZGdlcyk7XG4gICAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IHJlc3VsdC5vbGRFZGdlcy5hZGQob3BlcmF0aW9uUmVzdWx0Lm9sZEVkZ2VzKTtcbiAgICAgICAgcmVzdWx0LmVkZ2VzID0gcmVzdWx0LmVkZ2VzLmFkZChvcGVyYXRpb25SZXN1bHQuZWRnZXMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcblxuXG5cbiAgICAgIHJldHVybiBhcGk7IC8vIFJldHVybiB0aGUgQVBJIGluc3RhbmNlXG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSB3aG9sZSBzY3JhdGNocGFkIHJlc2VydmVkIGZvciB0aGlzIGV4dGVuc2lvbiAob24gYW4gZWxlbWVudCBvciBjb3JlKSBvciBnZXQgYSBzaW5nbGUgcHJvcGVydHkgb2YgaXRcbiAgICBmdW5jdGlvbiBnZXRTY3JhdGNoIChjeU9yRWxlLCBuYW1lKSB7XG4gICAgICBpZiAoY3lPckVsZS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScpID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY3lPckVsZS5zY3JhdGNoKCdfY3lFeHBhbmRDb2xsYXBzZScsIHt9KTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNjcmF0Y2ggPSBjeU9yRWxlLnNjcmF0Y2goJ19jeUV4cGFuZENvbGxhcHNlJyk7XG4gICAgICB2YXIgcmV0VmFsID0gKCBuYW1lID09PSB1bmRlZmluZWQgKSA/IHNjcmF0Y2ggOiBzY3JhdGNoW25hbWVdO1xuICAgICAgcmV0dXJuIHJldFZhbDtcbiAgICB9XG5cbiAgICAvLyBTZXQgYSBzaW5nbGUgcHJvcGVydHkgb24gc2NyYXRjaHBhZCBvZiBhbiBlbGVtZW50IG9yIHRoZSBjb3JlXG4gICAgZnVuY3Rpb24gc2V0U2NyYXRjaCAoY3lPckVsZSwgbmFtZSwgdmFsKSB7XG4gICAgICBnZXRTY3JhdGNoKGN5T3JFbGUpW25hbWVdID0gdmFsO1xuICAgIH1cblxuICAgIC8vIHJlZ2lzdGVyIHRoZSBleHRlbnNpb24gY3kuZXhwYW5kQ29sbGFwc2UoKVxuICAgIGN5dG9zY2FwZShcImNvcmVcIiwgXCJleHBhbmRDb2xsYXBzZVwiLCBmdW5jdGlvbiAob3B0cykge1xuICAgICAgdmFyIGN5ID0gdGhpcztcblxuICAgICAgdmFyIG9wdGlvbnMgPSBnZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycpIHx8IHtcbiAgICAgICAgbGF5b3V0Qnk6IG51bGwsIC8vIGZvciByZWFycmFuZ2UgYWZ0ZXIgZXhwYW5kL2NvbGxhcHNlLiBJdCdzIGp1c3QgbGF5b3V0IG9wdGlvbnMgb3Igd2hvbGUgbGF5b3V0IGZ1bmN0aW9uLiBDaG9vc2UgeW91ciBzaWRlIVxuICAgICAgICBmaXNoZXllOiB0cnVlLCAvLyB3aGV0aGVyIHRvIHBlcmZvcm0gZmlzaGV5ZSB2aWV3IGFmdGVyIGV4cGFuZC9jb2xsYXBzZSB5b3UgY2FuIHNwZWNpZnkgYSBmdW5jdGlvbiB0b29cbiAgICAgICAgYW5pbWF0ZTogdHJ1ZSwgLy8gd2hldGhlciB0byBhbmltYXRlIG9uIGRyYXdpbmcgY2hhbmdlcyB5b3UgY2FuIHNwZWNpZnkgYSBmdW5jdGlvbiB0b29cbiAgICAgICAgYW5pbWF0aW9uRHVyYXRpb246IDEwMDAsIC8vIHdoZW4gYW5pbWF0ZSBpcyB0cnVlLCB0aGUgZHVyYXRpb24gaW4gbWlsbGlzZWNvbmRzIG9mIHRoZSBhbmltYXRpb25cbiAgICAgICAgcmVhZHk6IGZ1bmN0aW9uICgpIHsgfSwgLy8gY2FsbGJhY2sgd2hlbiBleHBhbmQvY29sbGFwc2UgaW5pdGlhbGl6ZWRcbiAgICAgICAgdW5kb2FibGU6IHRydWUsIC8vIGFuZCBpZiB1bmRvUmVkb0V4dGVuc2lvbiBleGlzdHMsXG5cbiAgICAgICAgY3VlRW5hYmxlZDogdHJ1ZSwgLy8gV2hldGhlciBjdWVzIGFyZSBlbmFibGVkXG4gICAgICAgIGV4cGFuZENvbGxhcHNlQ3VlUG9zaXRpb246ICd0b3AtbGVmdCcsIC8vIGRlZmF1bHQgY3VlIHBvc2l0aW9uIGlzIHRvcCBsZWZ0IHlvdSBjYW4gc3BlY2lmeSBhIGZ1bmN0aW9uIHBlciBub2RlIHRvb1xuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVNpemU6IDEyLCAvLyBzaXplIG9mIGV4cGFuZC1jb2xsYXBzZSBjdWVcbiAgICAgICAgZXhwYW5kQ29sbGFwc2VDdWVMaW5lU2l6ZTogOCwgLy8gc2l6ZSBvZiBsaW5lcyB1c2VkIGZvciBkcmF3aW5nIHBsdXMtbWludXMgaWNvbnNcbiAgICAgICAgZXhwYW5kQ3VlSW1hZ2U6IHVuZGVmaW5lZCwgLy8gaW1hZ2Ugb2YgZXhwYW5kIGljb24gaWYgdW5kZWZpbmVkIGRyYXcgcmVndWxhciBleHBhbmQgY3VlXG4gICAgICAgIGNvbGxhcHNlQ3VlSW1hZ2U6IHVuZGVmaW5lZCwgLy8gaW1hZ2Ugb2YgY29sbGFwc2UgaWNvbiBpZiB1bmRlZmluZWQgZHJhdyByZWd1bGFyIGNvbGxhcHNlIGN1ZVxuICAgICAgICBleHBhbmRDb2xsYXBzZUN1ZVNlbnNpdGl2aXR5OiAxLCAvLyBzZW5zaXRpdml0eSBvZiBleHBhbmQtY29sbGFwc2UgY3Vlc1xuXG4gICAgICAgIGVkZ2VUeXBlSW5mbyA6IFwiZWRnZVR5cGVcIiwgLy90aGUgbmFtZSBvZiB0aGUgZmllbGQgdGhhdCBoYXMgdGhlIGVkZ2UgdHlwZSwgcmV0cmlldmVkIGZyb20gZWRnZS5kYXRhKCksIGNhbiBiZSBhIGZ1bmN0aW9uXG4gICAgICAgIGdyb3VwRWRnZXNPZlNhbWVUeXBlT25Db2xsYXBzZTogZmFsc2UsXG4gICAgICAgIGFsbG93TmVzdGVkRWRnZUNvbGxhcHNlOiB0cnVlLFxuICAgICAgICB6SW5kZXg6IDk5OSAvLyB6LWluZGV4IHZhbHVlIG9mIHRoZSBjYW52YXMgaW4gd2hpY2ggY3VlIMSxbWFnZXMgYXJlIGRyYXduXG4gICAgICB9O1xuXG4gICAgICAvLyBJZiBvcHRzIGlzIG5vdCAnZ2V0JyB0aGF0IGlzIGl0IGlzIGEgcmVhbCBvcHRpb25zIG9iamVjdCB0aGVuIGluaXRpbGl6ZSB0aGUgZXh0ZW5zaW9uXG4gICAgICBpZiAob3B0cyAhPT0gJ2dldCcpIHtcbiAgICAgICAgb3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMob3B0aW9ucywgb3B0cyk7XG5cbiAgICAgICAgdmFyIGV4cGFuZENvbGxhcHNlVXRpbGl0aWVzID0gcmVxdWlyZSgnLi9leHBhbmRDb2xsYXBzZVV0aWxpdGllcycpKGN5KTtcbiAgICAgICAgdmFyIGFwaSA9IGNyZWF0ZUV4dGVuc2lvbkFQSShjeSwgZXhwYW5kQ29sbGFwc2VVdGlsaXRpZXMpOyAvLyBjcmVhdGVzIGFuZCByZXR1cm5zIHRoZSBBUEkgaW5zdGFuY2UgZm9yIHRoZSBleHRlbnNpb25cblxuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnYXBpJywgYXBpKTtcblxuICAgICAgICB1bmRvUmVkb1V0aWxpdGllcyhjeSwgYXBpKTtcblxuICAgICAgICAvLyBPbmx5IHRyeSB0byByZW5kZXIgYnV0dG9ucyBpZiBub3QgaGVhZGxlc3MgYW5kIG9wdGlvbiBpcyBzZXRcbiAgICAgICAgaWYgKG9wdGlvbnMuY3VlRW5hYmxlZCAmJiBjeS5jb250YWluZXIoKSkge1xuICAgICAgICAgIGN1ZVV0aWxpdGllcyhvcHRpb25zLCBjeSwgYXBpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggb3B0aW9ucy5yZWFkeSApIHtcbiAgICAgICAgICBvcHRpb25zLnJlYWR5KCk7XG4gICAgICAgIH1cblxuICAgICAgICBzZXRTY3JhdGNoKGN5LCAnb3B0aW9ucycsIG9wdGlvbnMpO1xuXG4gICAgICAgIHZhciBwYXJlbnREYXRhID0ge307XG4gICAgICAgIHNldFNjcmF0Y2goY3ksICdwYXJlbnREYXRhJywgcGFyZW50RGF0YSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBnZXRTY3JhdGNoKGN5LCAnYXBpJyk7IC8vIEV4cG9zZSB0aGUgQVBJIHRvIHRoZSB1c2Vyc1xuICAgIH0pO1xuICB9O1xuXG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XG4gIH1cblxuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1leHBhbmQtY29sbGFwc2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gcmVnaXN0ZXI7XG4gICAgfSk7XG4gIH1cblxuICAgIGlmICh0eXBlb2YgY3l0b3NjYXBlICE9PSAndW5kZWZpbmVkJykgeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxuICAgICAgcmVnaXN0ZXIoY3l0b3NjYXBlKTtcbiAgfVxuXG59KSgpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3ksIGFwaSkge1xuICBpZiAoY3kudW5kb1JlZG8gPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgdmFyIHVyID0gY3kudW5kb1JlZG8oe30sIHRydWUpO1xuXG4gIGZ1bmN0aW9uIGdldEVsZXMoX2VsZXMpIHtcbiAgICByZXR1cm4gKHR5cGVvZiBfZWxlcyA9PT0gXCJzdHJpbmdcIikgPyBjeS4kKF9lbGVzKSA6IF9lbGVzO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Tm9kZVBvc2l0aW9ucygpIHtcbiAgICB2YXIgcG9zaXRpb25zID0ge307XG4gICAgdmFyIG5vZGVzID0gY3kubm9kZXMoKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBlbGUgPSBub2Rlc1tpXTtcbiAgICAgIHBvc2l0aW9uc1tlbGUuaWQoKV0gPSB7XG4gICAgICAgIHg6IGVsZS5wb3NpdGlvbihcInhcIiksXG4gICAgICAgIHk6IGVsZS5wb3NpdGlvbihcInlcIilcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHBvc2l0aW9ucztcbiAgfVxuXG4gIGZ1bmN0aW9uIHJldHVyblRvUG9zaXRpb25zKHBvc2l0aW9ucykge1xuICAgIHZhciBjdXJyZW50UG9zaXRpb25zID0ge307XG4gICAgY3kubm9kZXMoKS5ub3QoXCI6cGFyZW50XCIpLnBvc2l0aW9ucyhmdW5jdGlvbiAoZWxlLCBpKSB7XG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIGVsZSA9IGk7XG4gICAgICB9XG4gICAgICBjdXJyZW50UG9zaXRpb25zW2VsZS5pZCgpXSA9IHtcbiAgICAgICAgeDogZWxlLnBvc2l0aW9uKFwieFwiKSxcbiAgICAgICAgeTogZWxlLnBvc2l0aW9uKFwieVwiKVxuICAgICAgfTtcbiAgICAgIHZhciBwb3MgPSBwb3NpdGlvbnNbZWxlLmlkKCldO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgeDogcG9zLngsXG4gICAgICAgIHk6IHBvcy55XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGN1cnJlbnRQb3NpdGlvbnM7XG4gIH1cblxuICB2YXIgc2Vjb25kVGltZU9wdHMgPSB7XG4gICAgbGF5b3V0Qnk6IG51bGwsXG4gICAgYW5pbWF0ZTogZmFsc2UsXG4gICAgZmlzaGV5ZTogZmFsc2VcbiAgfTtcblxuICBmdW5jdGlvbiBkb0l0KGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIHZhciBub2RlcyA9IGdldEVsZXMoYXJncy5ub2Rlcyk7XG4gICAgICBpZiAoYXJncy5maXJzdFRpbWUpIHtcbiAgICAgICAgcmVzdWx0Lm9sZERhdGEgPSBnZXROb2RlUG9zaXRpb25zKCk7XG4gICAgICAgIHJlc3VsdC5ub2RlcyA9IGZ1bmMuaW5kZXhPZihcIkFsbFwiKSA+IDAgPyBhcGlbZnVuY10oYXJncy5vcHRpb25zKSA6IGFwaVtmdW5jXShub2RlcywgYXJncy5vcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdC5vbGREYXRhID0gZ2V0Tm9kZVBvc2l0aW9ucygpO1xuICAgICAgICByZXN1bHQubm9kZXMgPSBmdW5jLmluZGV4T2YoXCJBbGxcIikgPiAwID8gYXBpW2Z1bmNdKHNlY29uZFRpbWVPcHRzKSA6IGFwaVtmdW5jXShjeS5jb2xsZWN0aW9uKG5vZGVzKSwgc2Vjb25kVGltZU9wdHMpO1xuICAgICAgICByZXR1cm5Ub1Bvc2l0aW9ucyhhcmdzLm9sZERhdGEpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH1cblxuICB2YXIgYWN0aW9ucyA9IFtcImNvbGxhcHNlXCIsIFwiY29sbGFwc2VSZWN1cnNpdmVseVwiLCBcImNvbGxhcHNlQWxsXCIsIFwiZXhwYW5kXCIsIFwiZXhwYW5kUmVjdXJzaXZlbHlcIiwgXCJleHBhbmRBbGxcIl07XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYoaSA9PSAyKVxuICAgICAgdXIuYWN0aW9uKFwiY29sbGFwc2VBbGxcIiwgZG9JdChcImNvbGxhcHNlQWxsXCIpLCBkb0l0KFwiZXhwYW5kUmVjdXJzaXZlbHlcIikpO1xuICAgIGVsc2UgaWYoaSA9PSA1KVxuICAgICAgdXIuYWN0aW9uKFwiZXhwYW5kQWxsXCIsIGRvSXQoXCJleHBhbmRBbGxcIiksIGRvSXQoXCJjb2xsYXBzZVJlY3Vyc2l2ZWx5XCIpKTtcbiAgICBlbHNlXG4gICAgICB1ci5hY3Rpb24oYWN0aW9uc1tpXSwgZG9JdChhY3Rpb25zW2ldKSwgZG9JdChhY3Rpb25zWyhpICsgMykgJSA2XSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gY29sbGFwc2VFZGdlcyhhcmdzKXsgICAgXG4gICAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XG4gICAgdmFyIGVkZ2VzID0gYXJncy5lZGdlcztcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgXG4gICAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmKGFyZ3MuZmlyc3RUaW1lKXtcbiAgICAgIHZhciBjb2xsYXBzZVJlc3VsdCA9IGFwaS5jb2xsYXBzZUVkZ2VzKGVkZ2VzLG9wdGlvbnMpOyAgICBcbiAgICAgIHJlc3VsdC5lZGdlcyA9IGNvbGxhcHNlUmVzdWx0LmVkZ2VzO1xuICAgICAgcmVzdWx0Lm9sZEVkZ2VzID0gY29sbGFwc2VSZXN1bHQub2xkRWRnZXM7ICBcbiAgICAgIHJlc3VsdC5maXJzdFRpbWUgPSBmYWxzZTtcbiAgICB9ZWxzZXtcbiAgICAgIHJlc3VsdC5vbGRFZGdlcyA9IGVkZ2VzO1xuICAgICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcbiAgICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xuICAgICAgICBjeS5yZW1vdmUoYXJncy5lZGdlcyk7XG4gICAgICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcbiAgICAgIH1cbiAgICAgXG4gICAgIFxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gY29sbGFwc2VFZGdlc0JldHdlZW5Ob2RlcyhhcmdzKXtcbiAgICB2YXIgb3B0aW9ucyA9IGFyZ3Mub3B0aW9ucztcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmKGFyZ3MuZmlyc3RUaW1lKXtcbiAgICAgdmFyIGNvbGxhcHNlQWxsUmVzdWx0ID0gYXBpLmNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMoYXJncy5ub2Rlcywgb3B0aW9ucyk7XG4gICAgIHJlc3VsdC5lZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0LmVkZ2VzO1xuICAgICByZXN1bHQub2xkRWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5vbGRFZGdlcztcbiAgICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xuICAgIH1lbHNle1xuICAgICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xuICAgICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xuICAgICBpZihhcmdzLmVkZ2VzLmxlbmd0aCA+IDAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcbiAgICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcbiAgICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcbiAgICAgIH1cbiAgICBcbiAgICB9XG4gXG4gICAgcmV0dXJuIHJlc3VsdDtcblxuIH1cbiBmdW5jdGlvbiBjb2xsYXBzZUFsbEVkZ2VzKGFyZ3Mpe1xuICAgdmFyIG9wdGlvbnMgPSBhcmdzLm9wdGlvbnM7XG4gICB2YXIgcmVzdWx0ID0ge307XG4gICByZXN1bHQub3B0aW9ucyA9IG9wdGlvbnM7XG4gICBpZihhcmdzLmZpcnN0VGltZSl7XG4gICAgdmFyIGNvbGxhcHNlQWxsUmVzdWx0ID0gYXBpLmNvbGxhcHNlQWxsRWRnZXMob3B0aW9ucyk7XG4gICAgcmVzdWx0LmVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQuZWRnZXM7XG4gICAgcmVzdWx0Lm9sZEVkZ2VzID0gY29sbGFwc2VBbGxSZXN1bHQub2xkRWRnZXM7XG4gICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xuICAgfWVsc2V7XG4gICAgcmVzdWx0LmVkZ2VzID0gYXJncy5vbGRFZGdlcztcbiAgICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xuICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAgJiYgYXJncy5vbGRFZGdlcy5sZW5ndGggPiAwKXtcbiAgICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcbiAgICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcbiAgICAgIH1cbiAgIFxuICAgfVxuXG4gICByZXR1cm4gcmVzdWx0O1xuIH1cbiBmdW5jdGlvbiBleHBhbmRFZGdlcyhhcmdzKXsgICBcbiAgIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xuICAgdmFyIHJlc3VsdCA9e307XG4gIFxuICAgcmVzdWx0Lm9wdGlvbnMgPSBvcHRpb25zO1xuICAgaWYoYXJncy5maXJzdFRpbWUpe1xuICAgICB2YXIgZXhwYW5kUmVzdWx0ID0gYXBpLmV4cGFuZEVkZ2VzKGFyZ3MuZWRnZXMpO1xuICAgIHJlc3VsdC5lZGdlcyA9IGV4cGFuZFJlc3VsdC5lZGdlcztcbiAgICByZXN1bHQub2xkRWRnZXMgPSBleHBhbmRSZXN1bHQub2xkRWRnZXM7XG4gICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xuICAgIFxuICAgfWVsc2V7XG4gICAgcmVzdWx0Lm9sZEVkZ2VzID0gYXJncy5lZGdlcztcbiAgICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xuICAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xuICAgICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xuICAgICAgY3kuYWRkKGFyZ3Mub2xkRWRnZXMpO1xuICAgICAgfVxuICBcbiAgIH1cblxuICAgcmV0dXJuIHJlc3VsdDtcbiB9XG4gZnVuY3Rpb24gZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMoYXJncyl7XG4gIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xuICB2YXIgcmVzdWx0ID0ge307XG4gIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcbiAgaWYoYXJncy5maXJzdFRpbWUpe1xuICAgdmFyIGNvbGxhcHNlQWxsUmVzdWx0ID0gYXBpLmV4cGFuZEVkZ2VzQmV0d2Vlbk5vZGVzKGFyZ3Mubm9kZXMsb3B0aW9ucyk7XG4gICByZXN1bHQuZWRnZXMgPSBjb2xsYXBzZUFsbFJlc3VsdC5lZGdlcztcbiAgIHJlc3VsdC5vbGRFZGdlcyA9IGNvbGxhcHNlQWxsUmVzdWx0Lm9sZEVkZ2VzO1xuICAgcmVzdWx0LmZpcnN0VGltZSA9IGZhbHNlO1xuICB9ZWxzZXtcbiAgIHJlc3VsdC5lZGdlcyA9IGFyZ3Mub2xkRWRnZXM7XG4gICByZXN1bHQub2xkRWRnZXMgPSBhcmdzLmVkZ2VzO1xuICAgaWYoYXJncy5lZGdlcy5sZW5ndGggPiAwICYmIGFyZ3Mub2xkRWRnZXMubGVuZ3RoID4gMCl7XG4gICAgY3kucmVtb3ZlKGFyZ3MuZWRnZXMpO1xuICAgIGN5LmFkZChhcmdzLm9sZEVkZ2VzKTtcbiAgICB9XG4gIFxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbiB9XG4gZnVuY3Rpb24gZXhwYW5kQWxsRWRnZXMoYXJncyl7XG4gIHZhciBvcHRpb25zID0gYXJncy5vcHRpb25zO1xuICB2YXIgcmVzdWx0ID0ge307XG4gIHJlc3VsdC5vcHRpb25zID0gb3B0aW9ucztcbiAgaWYoYXJncy5maXJzdFRpbWUpe1xuICAgdmFyIGV4cGFuZFJlc3VsdCA9IGFwaS5leHBhbmRBbGxFZGdlcyhvcHRpb25zKTtcbiAgIHJlc3VsdC5lZGdlcyA9IGV4cGFuZFJlc3VsdC5lZGdlcztcbiAgIHJlc3VsdC5vbGRFZGdlcyA9IGV4cGFuZFJlc3VsdC5vbGRFZGdlcztcbiAgIHJlc3VsdC5maXJzdFRpbWUgPSBmYWxzZTtcbiAgfWVsc2V7XG4gICByZXN1bHQuZWRnZXMgPSBhcmdzLm9sZEVkZ2VzO1xuICAgcmVzdWx0Lm9sZEVkZ2VzID0gYXJncy5lZGdlcztcbiAgIGlmKGFyZ3MuZWRnZXMubGVuZ3RoID4gMCAmJiBhcmdzLm9sZEVkZ2VzLmxlbmd0aCA+IDApe1xuICAgIGN5LnJlbW92ZShhcmdzLmVkZ2VzKTtcbiAgICBjeS5hZGQoYXJncy5vbGRFZGdlcyk7XG4gICAgfVxuICAgXG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xuIH1cbiBcbiBcbiAgdXIuYWN0aW9uKFwiY29sbGFwc2VFZGdlc1wiLCBjb2xsYXBzZUVkZ2VzLCBleHBhbmRFZGdlcyk7XG4gIHVyLmFjdGlvbihcImV4cGFuZEVkZ2VzXCIsIGV4cGFuZEVkZ2VzLCBjb2xsYXBzZUVkZ2VzKTtcblxuICB1ci5hY3Rpb24oXCJjb2xsYXBzZUVkZ2VzQmV0d2Vlbk5vZGVzXCIsIGNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMsIGV4cGFuZEVkZ2VzQmV0d2Vlbk5vZGVzKTtcbiAgdXIuYWN0aW9uKFwiZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXNcIiwgZXhwYW5kRWRnZXNCZXR3ZWVuTm9kZXMsIGNvbGxhcHNlRWRnZXNCZXR3ZWVuTm9kZXMpO1xuXG4gIHVyLmFjdGlvbihcImNvbGxhcHNlQWxsRWRnZXNcIiwgY29sbGFwc2VBbGxFZGdlcywgZXhwYW5kQWxsRWRnZXMpO1xuICB1ci5hY3Rpb24oXCJleHBhbmRBbGxFZGdlc1wiLCBleHBhbmRBbGxFZGdlcywgY29sbGFwc2VBbGxFZGdlcyk7XG5cbiBcblxuXG4gIFxuXG5cbn07XG4iXX0=
