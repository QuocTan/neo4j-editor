(function (f) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f()
  } else if (typeof define === "function" && define.amd) {
    define([], f)
  } else {
    var g;
    if (typeof window !== "undefined") {
      g = window
    } else if (typeof global !== "undefined") {
      g = global
    } else if (typeof self !== "undefined") {
      g = self
    } else {
      g = this
    }
    g.Neo4jd3 = f()
  }
})(function () {
  var define, module, exports;
  return (function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          var a = typeof require == "function" && require;
          if (!u && a) return a(o, !0);
          if (i) return i(o, !0);
          var f = new Error("Cannot find module '" + o + "'");
          throw f.code = "MODULE_NOT_FOUND", f
        }
        var l = n[o] = {exports: {}};
        t[o][0].call(l.exports, function (e) {
          var n = t[o][1][e];
          return s(n ? n : e)
        }, l, l.exports, e, t, n, r)
      }
      return n[o].exports
    }

    var i = typeof require == "function" && require;
    for (var o = 0; o < r.length; o++) s(r[o]);
    return s
  })({
    1: [function (_dereq_, module, exports) {
      'use strict';

      var neo4jd3 = _dereq_('./scripts/neo4jd3');

      module.exports = neo4jd3;

    }, {"./scripts/neo4jd3": 2}], 2: [function (_dereq_, module, exports) {
      /* global d3, document */
      /* jshint latedef:nofunc */
      'use strict';

      function Neo4jD3(_selector, _options) {
        var container, graph, info, node, nodes, relationship, relationshipOutline, relationshipOverlay,
          relationshipText, relationships, selector, simulation, svg, svgNodes, svgRelationships, svgScale,
          svgTranslate,
          classes2colors = {},
          justLoaded = false,
          numClasses = 0,
          options = {
            arrowSize: 4,
            colors: colors(),
            highlight: undefined,
            iconMap: '',
            icons: undefined,
            imageMap: {},
            images: undefined,
            infoPanel: true,
            minCollision: undefined,
            neo4jData: undefined,
            neo4jDataUrl: undefined,
            nodeOutlineFillColor: undefined,
            nodeRadius: 25,
            relationshipColor: '#a5abb6',
            zoomFit: false
          },
          builtRelations = {},
          relationCount = {},
          VERSION = '0.0.1';

        function appendGraph(container) {
          svg = container.append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('class', 'neo4jd3-graph')
            .call(d3.zoom().on('zoom', function () {
              var scale = d3.event.transform.k,
                translate = [d3.event.transform.x, d3.event.transform.y];

              if (svgTranslate) {
                translate[0] += svgTranslate[0];
                translate[1] += svgTranslate[1];
              }

              if (svgScale) {
                scale *= svgScale;
              }

              svg.attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')');
            }))
            .on('dblclick.zoom', null)
            .append('g')
            .attr('width', '100%')
            .attr('height', '100%');

          svgRelationships = svg.append('g')
            .attr('class', 'relationships');

          svgNodes = svg.append('g')
            .attr('class', 'nodes');

          svg.append("svg:defs").append("svg:marker")
            .attr("id", "triangle")
            .attr("refX", 2)
            .attr("refY", 2)
            .attr("markerWidth", 30)
            .attr("markerHeight", 30)
            .attr("markerUnits", "userSpaceOnUse")
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0 0 4 2 0 4 1 2")
            .style("fill", "#a5abb6");
        }

        function appendImageToNode(node) {
          return node.append('image')
            .attr('height', function (d) {
              return icon(d) ? '24px' : '30px';
            })
            .attr('x', function (d) {
              return icon(d) ? '5px' : '-15px';
            })
            .attr('xlink:href', function (d) {
              return image(d);
            })
            .attr('y', function (d) {
              return icon(d) ? '5px' : '-16px';
            })
            .attr('width', function (d) {
              return icon(d) ? '24px' : '30px';
            });
        }

        function appendInfoPanel(container) {
          return container.append('div')
            .attr('class', 'neo4jd3-info');
        }

        function appendInfoElement(cls, isNode, property, value) {
          var elem = info.append('a');

          elem.attr('href', '#')
            .attr('class', cls)
            .html('<strong>' + property + '</strong>' + (value ? (': ' + value) : ''));

          if (!value) {
            elem.style('background-color', function (d) {
              return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : (isNode ? class2color(property) : defaultColor());
            })
              .style('border-color', function (d) {
                return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : (isNode ? class2darkenColor(property) : defaultDarkenColor());
              })
              .style('color', function (d) {
                return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : '#fff';
              });
          }
        }

        function appendInfoElementClass(cls, node) {
          appendInfoElement(cls, true, node);
        }

        function appendInfoElementProperty(cls, property, value) {
          appendInfoElement(cls, false, property, value);
        }

        function appendInfoElementRelationship(cls, relationship) {
          appendInfoElement(cls, false, relationship);
        }

        function appendNode() {
          return node.enter()
            .append('g')
            .attr('class', function (d) {
              var highlight, i,
                classes = 'node',
                label = d.labels[0];

              if (icon(d)) {
                classes += ' node-icon';
              }

              if (image(d)) {
                classes += ' node-image';
              }

              if (options.highlight) {
                for (i = 0; i < options.highlight.length; i++) {
                  highlight = options.highlight[i];

                  if (d.labels[0] === highlight.class && d.properties[highlight.property] === highlight.value) {
                    classes += ' node-highlighted';
                    break;
                  }
                }
              }

              return classes;
            })
            .on('click', function (d) {
              d.fx = d.fy = null;

              if (typeof options.onNodeClick === 'function') {
                options.onNodeClick(d);
              }
            })
            .on('dblclick', function (d) {
              stickNode(d);

              if (typeof options.onNodeDoubleClick === 'function') {
                options.onNodeDoubleClick(d);
              }
            })
            .on('mouseenter', function (d) {
              if (info) {
                updateInfo(d);
              }

              if (typeof options.onNodeMouseEnter === 'function') {
                options.onNodeMouseEnter(d);
              }
            })
            .on('mouseleave', function (d) {
              if (info) {
                clearInfo(d);
              }

              if (typeof options.onNodeMouseLeave === 'function') {
                options.onNodeMouseLeave(d);
              }
            })
            .call(d3.drag()
              .on('start', dragStarted)
              .on('drag', dragged)
              .on('end', dragEnded));
        }

        function appendNodeToGraph() {
          var n = appendNode();

          appendRingToNode(n);
          appendOutlineToNode(n);
          appendTextToNode(n);

          if (options.images) {
            appendImageToNode(n);
          }
          return n;
        }

        function appendOutlineToNode(node) {
          return node.append('circle')
            .attr('class', 'outline')
            .attr('r', options.nodeRadius)
            .style('fill', function (d) {
              return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : class2color(d.labels[0]);
            })
            .style('stroke', function (d) {
              return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : class2darkenColor(d.labels[0]);
            })
            .append('title').text(function (d) {
              return toString(d);
            });
        }

        function appendRingToNode(node) {
          return node.append('circle')
            .attr('class', 'ring')
            .attr('r', options.nodeRadius * 1.16)
            .append('title').text(function (d) {
              return toString(d);
            });
        }

        function appendTextToNode(node) {
          return node.append('text')
            .attr('class', function (d) {
              return 'text' + (icon(d) ? ' icon' : '');
            })
            .attr('fill', '#ffffff')
            .attr('font-size', function (d) {
              return icon(d) ? (options.nodeRadius + 'px') : '10px';
            })
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .attr('y', function (d) {
              return icon(d) ? (parseInt(Math.round(options.nodeRadius * 0.32)) + 'px') : '4px';
            })
            .html(function (d) {
              var _icon = icon(d);
              return _icon ? '&#x' + _icon : d.properties.name;
            });
        }

        function appendRelationship() {
          return relationship.enter()
            .append('g')
            .attr('class', 'relationship')
            .on('click', function (d) {
              if (typeof options.onRelationshipClick === 'function') {
                options.onRelationshipClick(d);
              }
            })
            .on('dblclick', function (d) {
              if (typeof options.onRelationshipDoubleClick === 'function') {
                options.onRelationshipDoubleClick(d);
              }
            })
            .on('mouseenter', function (d) {
              if (info) {
                updateInfo(d);
              }
            });
        }

        function appendOutlineToRelationship(r) {
          return r.append('path')
            .attr('class', 'outline link')
            .attr('fill', '#a5abb6')
            .attr("marker-end", "url(#triangle)");
        }

        function appendOverlayToRelationship(r) {
          return r.append('path')
            .attr('class', 'overlay')
        }

        function appendTextToRelationship(r) {
          return r.append('text')
            .style("background-color", "steelblue")
            .attr('class', 'text')
            .attr('fill', '#000000')
            .attr('font-size', '4px')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .text(function (d) {
              let text = d.type;//builtRelations[`${d.startNode},${d.endNode},${d.type},`] ? '  '.repeat(d.type.length): d.type;
              builtRelations[`${d.endNode},${d.startNode},${d.type},`] = true;
              return text;
            });
        }

        function appendRelationshipToGraph() {
          var relationship = appendRelationship(),
            text = appendTextToRelationship(relationship),
            outline = appendOutlineToRelationship(relationship),
            overlay = appendOverlayToRelationship(relationship);

          return {
            outline: outline,
            overlay: overlay,
            relationship: relationship,
            text: text
          };
        }

        function class2color(cls) {
          var color = classes2colors[cls];

          if (!color) {
//            color = options.colors[Math.min(numClasses, options.colors.length - 1)];
            color = options.colors[numClasses % options.colors.length];
            classes2colors[cls] = color;
            numClasses++;
          }

          return color;
        }

        function class2darkenColor(cls) {
          return d3.rgb(class2color(cls)).darker(1);
        }

        function clearInfo() {
          info.html('');
        }

        function color() {
          return options.colors[options.colors.length * Math.random() << 0];
        }

        function colors() {
          // d3.schemeCategory10,
          // d3.schemeCategory20,
          return [
            '#68bdf6', // light blue
            '#6dce9e', // green #1
            '#faafc2', // light pink
            '#f2baf6', // purple
            '#ff928c', // light red
            '#fcea7e', // light yellow
            '#ffc766', // light orange
            '#405f9e', // navy blue
            '#a5abb6', // dark gray
            '#78cecb', // green #2,
            '#b88cbb', // dark purple
            '#ced2d9', // light gray
            '#e84646', // dark red
            '#fa5f86', // dark pink
            '#ffab1a', // dark orange
            '#fcda19', // dark yellow
            '#797b80', // black
            '#c9d96f', // pistacchio
            '#47991f', // green #3
            '#70edee', // turquoise
            '#ff75ea'  // pink
          ];
        }

        function contains(array, id) {
          var filter = array.filter(function (elem) {
            return elem.id === id;
          });

          return filter.length > 0;
        }

        function defaultColor() {
          return options.relationshipColor;
        }

        function defaultDarkenColor() {
          return d3.rgb(options.colors[options.colors.length - 1]).darker(1);
        }

        function dragEnded(d) {
          if (!d3.event.active) {
            simulation.alphaTarget(0);
          }

          if (typeof options.onNodeDragEnd === 'function') {
            options.onNodeDragEnd(d);
          }
        }

        function dragged(d) {
          stickNode(d);
        }

        function dragStarted(d) {
          if (!d3.event.active) {
            simulation.alphaTarget(0.3).restart();
          }

          d.fx = d.x;
          d.fy = d.y;

          if (typeof options.onNodeDragStart === 'function') {
            options.onNodeDragStart(d);
          }
        }

        function extend(obj1, obj2) {
          var obj = {};

          merge(obj, obj1);
          merge(obj, obj2);

          return obj;
        }

        function icon(d) {
          var code;

          if (options.iconMap && options.showIcons && options.icons) {
            if (options.icons[d.labels[0]] && options.iconMap[options.icons[d.labels[0]]]) {
              code = options.iconMap[options.icons[d.labels[0]]];
            } else if (options.iconMap[d.labels[0]]) {
              code = options.iconMap[d.labels[0]];
            } else if (options.icons[d.labels[0]]) {
              code = options.icons[d.labels[0]];
            }
          }

          return code;
        }

        function image(d) {
          var i, imagesForLabel, img, imgLevel, label, labelPropertyValue, property, value;

          if (options.images) {
            imagesForLabel = options.imageMap[d.labels[0]];

            if (imagesForLabel) {
              imgLevel = 0;

              for (i = 0; i < imagesForLabel.length; i++) {
                labelPropertyValue = imagesForLabel[i].split('|');

                switch (labelPropertyValue.length) {
                  case 3:
                    value = labelPropertyValue[2];
                  /* falls through */
                  case 2:
                    property = labelPropertyValue[1];
                  /* falls through */
                  case 1:
                    label = labelPropertyValue[0];
                }

                if (d.labels[0] === label &&
                  (!property || d.properties[property] !== undefined) &&
                  (!value || d.properties[property] === value)) {
                  if (labelPropertyValue.length > imgLevel) {
                    img = options.images[imagesForLabel[i]];
                    imgLevel = labelPropertyValue.length;
                  }
                }
              }
            }
          }

          return img;
        }

        function init(_selector, _options) {
          initIconMap();

          merge(options, _options);

          if (options.icons) {
            options.showIcons = true;
          }

          if (!options.minCollision) {
            options.minCollision = options.nodeRadius * 2;
          }

          initImageMap();

          selector = _selector;

          container = d3.select(selector);

          container.attr('class', 'neo4jd3')
            .html('');

          if (options.infoPanel) {
            info = appendInfoPanel(container);
          }

          appendGraph(container);

          simulation = initSimulation();

          if (options.neo4jData) {
            loadNeo4jData(options.neo4jData);
          } else if (options.neo4jDataUrl) {
            loadNeo4jDataFromUrl(options.neo4jDataUrl);
          } else {
            console.error('Error: both neo4jData and neo4jDataUrl are empty!');
          }
        }

        function initIconMap() {
          Object.keys(options.iconMap).forEach(function (key, index) {
            var keys = key.split(','),
              value = options.iconMap[key];

            keys.forEach(function (key) {
              options.iconMap[key] = value;
            });
          });
        }

        function initImageMap() {
          var key, keys, selector;

          for (key in options.images) {
            if (options.images.hasOwnProperty(key)) {
              keys = key.split('|');

              if (!options.imageMap[keys[0]]) {
                options.imageMap[keys[0]] = [key];
              } else {
                options.imageMap[keys[0]].push(key);
              }
            }
          }
        }

        function initSimulation() {
          var simulation = d3.forceSimulation()
          //                           .velocityDecay(0.8)
          //                           .force('x', d3.force().strength(0.002))
          //                           .force('y', d3.force().strength(0.002))
            .force('collide', d3.forceCollide().radius(function (d) {
              return options.minCollision;
            }).iterations(2))
            .force('charge', d3.forceManyBody())
            .force('link', d3.forceLink().id(function (d) {
              return d.id;
            }))
            .force('center', d3.forceCenter(svg.node().parentElement.parentElement.clientWidth / 2, svg.node().parentElement.parentElement.clientHeight / 2))
            .on('tick', function () {
              tick();
            })
            .on('end', function () {
              if (options.zoomFit && !justLoaded) {
                justLoaded = true;
                zoomFit(2);
              }
            });

          return simulation;
        }

        function loadNeo4jData() {
          nodes = [];
          relationships = [];

          updateWithNeo4jData(options.neo4jData);
        }

        function loadNeo4jDataFromUrl(neo4jDataUrl) {
          nodes = [];
          relationships = [];

          d3.json(neo4jDataUrl, function (error, data) {
            if (error) {
              throw error;
            }

            updateWithNeo4jData(data);
          });
        }

        function resetWithNeo4jData(neo4jData) {
          // Call the init method again with new data
          var newOptions = Object.assign(_options, { neo4jData: neo4jData, neo4jDataUrl: undefined });
          init(_selector, newOptions);
        }

        function merge(target, source) {
          Object.keys(source).forEach(function (property) {
            target[property] = source[property];
          });
        }

        function neo4jDataToD3Data(data) {
          var graph = {
            nodes: [],
            relationships: []
          };
          data.results.forEach(function (result) {
            result.data.forEach(function (data) {
              data.graph.nodes.forEach(function (node) {
                if (!contains(graph.nodes, node.id)) {
                  graph.nodes.push(node);
                }
              });

              data.graph.relationships.forEach(function (relationship) {
                if (relationship.startNode == relationship.endNode) return;
                relationship.source = relationship.startNode;
                relationship.target = relationship.endNode;
                graph.relationships.push(relationship);
              });

              data.graph.relationships.sort(function (a, b) {
                if (a.source > b.source) {
                  return 1;
                } else if (a.source < b.source) {
                  return -1;
                } else {
                  if (a.target > b.target) {
                    return 1;
                  }

                  if (a.target < b.target) {
                    return -1;
                  } else {
                    return 0;
                  }
                }
              });

              for (var i = 0; i < data.graph.relationships.length; i++) {
                if (i !== 0 && data.graph.relationships[i].source === data.graph.relationships[i - 1].source && data.graph.relationships[i].target === data.graph.relationships[i - 1].target) {
                  data.graph.relationships[i].linknum = data.graph.relationships[i - 1].linknum + 1;
                } else {
                  data.graph.relationships[i].linknum = 1;
                }
              }
            });
          });

          return graph;
        }

        
        function rotate(cx, cy, x, y, angle) {
          var radians = (Math.PI / 180) * angle,
            cos = Math.cos(radians),
            sin = Math.sin(radians),
            nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
            ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;

          return {x: nx, y: ny};
        }

        function rotatePoint(c, p, angle) {
          return rotate(c.x, c.y, p.x, p.y, angle);
        }

        function rotation(source, target) {
          return Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI;
        }

        function size() {
          return {
            nodes: nodes.length,
            relationships: relationships.length
          };
        }

        /*
            function smoothTransform(elem, translate, scale) {
                var animationMilliseconds = 5000,
                    timeoutMilliseconds = 50,
                    steps = parseInt(animationMilliseconds / timeoutMilliseconds);

                setTimeout(function() {
                    smoothTransformStep(elem, translate, scale, timeoutMilliseconds, 1, steps);
                }, timeoutMilliseconds);
            }

            function smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step, steps) {
                var progress = step / steps;

                elem.attr('transform', 'translate(' + (translate[0] * progress) + ', ' + (translate[1] * progress) + ') scale(' + (scale * progress) + ')');

                if (step < steps) {
                    setTimeout(function() {
                        smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step + 1, steps);
                    }, timeoutMilliseconds);
                }
            }
        */
        function stickNode(d) {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
        }

        function tick() {
          tickNodes();
          tickRelationships();
        }

        function tickNodes() {
          if (node) {
            node.attr('transform', function (d) {
              return 'translate(' + d.x + ', ' + d.y + ')';
            });
          }
        }

        function tickRelationships() {
          if (relationship) {
            relationship.attr('transform', function (d) {
              if (!d.linkn) {
                var key = d.source.id + '@@' + d.target.id;
                if (!relationCount[key])
                  relationCount[key] = 1;
                d.linkn = relationCount[key]++;
              }

              var center = {x: 0, y: 0},
                angle = rotation(d.source, d.target),
                u = unitaryVector(d.source, d.target),
                n = unitaryNormalVector(d.source, d.target),
                g = rotatePoint(center, u, -10 * d.linkn),
                source = rotatePoint(center, {
                  x: 0 + (options.nodeRadius + 1) * u.x - n.x,
                  y: 0 + (options.nodeRadius + 1) * u.y - n.y
                }, angle + 10 * d.linkn),
                target = rotatePoint(center, {
                  x: d.target.x - d.source.x - (options.nodeRadius + 2) * g.x,
                  y: d.target.y - d.source.y - (options.nodeRadius + 2) * g.y
                }, angle),
                uu = unitaryNormalVector(source, target),
                middle = {
                  x: (source.x + target.x) / 2 + uu.x * 20 * d.linkn,
                  y: (source.y + target.y) / 2 + uu.y * 20 * d.linkn
                };
              d.outline = {middle: middle, source: source, target: target, u: uu}

              return 'translate(' + d.source.x + ', ' + d.source.y + ') rotate(' + angle + ')';
            });

            tickRelationshipsTexts();
            tickRelationshipsOutlines();
            tickRelationshipsOverlays();
          }
        }

        function tickRelationshipsOutlines() {
          relationship.each(function (relationship) {
            var rel = d3.select(this),
              outline = rel.select('.outline');
            outline.attr('d', function (d) {
              var source = d.outline.source,
                target = d.outline.target,
                middle = d.outline.middle;
              return `M ${target.x}, ${target.y} 
                Q ${middle.x} ${middle.y} ${source.x} ${source.y} 
                Q ${middle.x} ${middle.y} ${target.x}, ${target.y}
                `;
            });
          });
        }

        function tickRelationshipsOverlays() {
          relationshipOverlay.attr('d', function (d) {
            var source = d.outline.source,
              target = d.outline.target,
              middle = d.outline.middle,
              u = d.outline.u;
            return `M ${source.x}, ${source.y} 
                Q ${middle.x + 5 * u.x} ${middle.y + 5 * u.y} ${target.x} ${target.y}
                Q  ${middle.x - 5 * u.x} ${middle.y - 5 * u.y}  ${source.x} ${source.y}
                Z`;
          });
        }

        function tickRelationshipsTexts() {
          relationshipText.attr('transform', function (d) {
            var angle = (rotation(d.source, d.target) + 360) % 360,
              mirror = angle > 90 && angle < 270,
              source = d.outline.source,
              target = d.outline.target,
              u = d.outline.u,
              middle = {
                x: (source.x + target.x) / 2 + u.x * (mirror ? 8 : 10) * d.linkn + u.x,
                y: (source.y + target.y) / 2 + u.y * (mirror ? 8 : 10) * d.linkn + u.y
              };
            return 'translate(' + middle.x + ', ' + middle.y + ') rotate(' + (mirror ? 180 : 0) + ')';
          });
        }

        function toString(d) {
          var s = d.labels ? d.labels[0] : d.type;

          s += ' (<id>: ' + d.id;

          Object.keys(d.properties).forEach(function (property) {
            s += ', ' + property + ': ' + JSON.stringify(d.properties[property]);
          });

          s += ')';

          return s;
        }

        function unitaryNormalVector(source, target, newLength) {
          var center = {x: 0, y: 0},
            vector = unitaryVector(source, target, newLength);

          return rotatePoint(center, vector, 90);
        }

        function unitaryVector(source, target, newLength) {
          var length = Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)) / Math.sqrt(newLength || 1);

          return {
            x: (target.x - source.x) / length,
            y: (target.y - source.y) / length,
          };
        }

        function updateWithD3Data(d3Data) {
          updateNodesAndRelationships(d3Data.nodes, d3Data.relationships);
        }

        function updateWithNeo4jData(neo4jData) {
          var d3Data = neo4jDataToD3Data(neo4jData);
          updateWithD3Data(d3Data);
        }

        function updateInfo(d) {
          clearInfo();

          if (d.labels) {
            appendInfoElementClass('class', d.labels[0]);
          } else {
            appendInfoElementRelationship('class', d.type);
          }

          appendInfoElementProperty('property', '&lt;id&gt;', d.id);

          Object.keys(d.properties).forEach(function (property) {
            appendInfoElementProperty('property', property, JSON.stringify(d.properties[property]));
          });
        }

        function updateNodes(n) {
          Array.prototype.push.apply(nodes, n);

          node = svgNodes.selectAll('.node')
            .data(nodes, function (d) {
              return d.id;
            });
          var nodeEnter = appendNodeToGraph();
          node = nodeEnter.merge(node);
        }

        function updateNodesAndRelationships(n, r) {
          updateRelationships(r);
          updateNodes(n);

          simulation.nodes(nodes);
          simulation.force('link').links(relationships);
        }

        function updateRelationships(r) {
          Array.prototype.push.apply(relationships, r);

          relationship = svgRelationships.selectAll('.relationship')
            .data(relationships, function (d) {
              return d.id;
            });

          var relationshipEnter = appendRelationshipToGraph();

          relationship = relationshipEnter.relationship.merge(relationship);

          relationshipOutline = svg.selectAll('.relationship .outline');
          relationshipOutline = relationshipEnter.outline.merge(relationshipOutline);

          relationshipOverlay = svg.selectAll('.relationship .overlay');
          relationshipOverlay = relationshipEnter.overlay.merge(relationshipOverlay);

          relationshipText = svg.selectAll('.relationship .text');
          relationshipText = relationshipEnter.text.merge(relationshipText);
        }

        function version() {
          return VERSION;
        }

        function zoomFit(transitionDuration) {
          var bounds = svg.node().getBBox(),
            parent = svg.node().parentElement.parentElement,
            fullWidth = parent.clientWidth,
            fullHeight = parent.clientHeight,
            width = bounds.width,
            height = bounds.height,
            midX = bounds.x + width / 2,
            midY = bounds.y + height / 2;

          if (width === 0 || height === 0) {
            return; // nothing to fit
          }

          svgScale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
          svgTranslate = [fullWidth / 2 - svgScale * midX, fullHeight / 2 - svgScale * midY];

          svg.attr('transform', 'translate(' + svgTranslate[0] + ', ' + svgTranslate[1] + ') scale(' + svgScale + ')');
          // smoothTransform(svgTranslate, svgScale);
        }

        init(_selector, _options);

        return {
          neo4jDataToD3Data: neo4jDataToD3Data,
          size: size,
          resetWithNeo4jData: resetWithNeo4jData,
          updateNodesAndRelationships: updateNodesAndRelationships,
          version: version
        };
      }

      module.exports = Neo4jD3;

    }, {}]
  }, {}, [1])(1)
});
