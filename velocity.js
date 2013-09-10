var Template = (function (undef) {
    'use strict';
    var util,
        templates = {},
        SENTENCE = /#([a-z]+)\(([\s\S]+?)\)/,
        VARIABLE = /\$\{\w[\w\.]*\}/g,
        velocity;
	
    util = {
        each: function (arr, cb) {
            var i = 0, l = arr.length;
            for (; i < l; i++) {
                cb(arr[i], i, arr);
            }
        },
        trim: function (str) {
            return str.replace(/^\s+|\s+$/g, '');
        },
        log: function(msg, type){
            Template.log(msg, type);
        }
    };

    velocity = {
        parse: function (str, params) {
            var result;
            params = params || {};

            while ((result = SENTENCE.exec(str)) !== null) {
                switch (result[1]) {
                    case 'set':
                        str = this.parseSet(str, params, result);
                        break;
                    case 'if':
                        str = this.parseIf(str, params, result);
                        break;
                    case 'foreach':
                        str = this.parseForeach(str, params, result);
                        break;
                    case 'macro':
                        str = this.parseMacro(str, params, result);
                        break;
                }
                //break; //debug开发阶段只执行一次
            }
            str = this.replaceVariable(str, params);
            return str;
        },
        parseSet: function (str, params, result) { //parse #set
            var start = result.index,
                end = start + result[0].length,
                expression = result[2];

            if (expression.indexOf('=') > -1) {
                expression = expression.split('=');
                params[expression[0].slice(2, -1)] = this.express(expression[1], params);
            } else {
                util.log('#set syntac error', 'warn');
            }
            str = str.slice(0, start) + str.slice(end);
            return str;
        },
        parseIf: function (str, params, result) { //parse #if
            var flag = this.express(this.velocityToVariable(result[2], params), params),
                start = result.index,
                middle = this.matchElse(str),
                end = this.matchEnd(str);

            if (end === -1) {
                util.log('syntax error，miss #end', 'warn');
                return str;
            }

            //#if(expression) length=5+expression.length
            //#end length=4
            //#else length=5
            if (middle > -1 && middle < end) {
                if (flag) {
                    str = str.slice(0, start) + str.slice(start + result[2].length + 5, middle) + str.slice(end + 4);
                } else {
                    str = str.slice(0, start) + str.slice(middle + 5, end) + str.slice(end + 4);
                }
            } else {
                if (flag) {
                    str = str.slice(0, start) + str.slice(start + result[2].length + 5, end) + str.slice(end + 4);
                } else {
                    str = str.slice(0, start) + str.slice(end + 4);
                }
            }
            return str;
        },
        //#foreach(expression) length=10+expression.length
        //#end length=4
        parseForeach: function (str, params, result) { //parse #foreach
            var start = result.index,
                end = this.matchEnd(str),
                context = str.slice(start + result[2].length + 10, end),
                arr = result[2].split(' in '),
                list, item, html = '';

            if (arr.length !== 2) {
                util.log('syntax error: ' + result[0], 'error');
                return str;
            }

            item = util.trim(arr[0]).slice(2, -1);
            list = this.getVariable(util.trim(arr[1]).slice(2, -1), params);
            
            if (list) {
                util.each(list, function (o, index) {
                    var p = velocity.clone(params);
                    p[item] = list[index];
                    p.velocityCount = index + 1;
                    
                    html += velocity.parse(context, p);
                });
            }
            str = str.slice(0, start) + html + str.slice(end + 4);

            return str;
        },
        //#macro(funcName $variable1 $variable2);
        parseMacro: function(str, params, result){ //parse #macro
            var start = result.index,
                end = start + result[0].length,
                ret = '', func,
                arr = [];
            
            //filter whitespace
            util.each(result[2].split(' '), function(v, index){
                v = util.trim(v);
				if (v !== '') {
                    if (index > 0) {
                        arr.push(velocity.getVariable(v.slice(2, -1), params));
                    } else {
                        arr.push(v);
                    }
                }
            });
            
            func = arr[0];
            if (func) {
                func = params[func];
                if (func) {
                    ret = func.apply(null, arr.slice(1)) || '';
                } else {
                    util.log('#macro ' + arr[0] + ' is undefined',  'error');
                }
            } else {
                util.log('#macro syntax error, macro name is undefined', 'error')
            }
            str = str.slice(0, start) + ret + str.slice(end);
            return str;
        },
        clone: function () { //clone object
            var ret = {},
                i, len, o, p;
            for (i = 0, len = arguments.length; i < len; i++) {
                o = arguments[i];
                for (p in o) {
                    if (o.hasOwnProperty(p) && !ret[p]) {
                        ret[p] = o[p];
                    }
                }
            }
            return ret;
        },
        express: function (expression, params) {
            return eval('(' + expression + ')');
        },
        velocityToVariable: function (str, params) { //velocity to JS
            str = str.replace(VARIABLE, function (all) {
				return 'params.' + all.slice(2, -1);
            });
            return str;
        },
        replaceVariable: function (str, params) { //display velocity variables
            str = str.replace(VARIABLE, function (all) {
                var name = all.slice(2, -1),
                    value = velocity.getVariable(name, params);

                if (value !== undef) {
                    return value;
                } else {
                    util.log('Variables ' + all + ' is undefined', 'warn');
                    return all;
                }
            });
            return str;
        },
        getVariable: function (name, params) {
            var ret, tmp, arr, i, len;
            if (name.indexOf('.') === -1) {
                ret = params[name];
            } else {
                ret = params;
                arr = name.split('.');
                for (i = 0, len = arr.length; i < len; i++) {
                    if (ret[arr[i]] !== undef) {
                        ret = ret[arr[i]];
                    } else {
                        util.log('Variables ' + name + ' is undefined', 'warn');
                        ret = '';
                        break;
                    }
                }
            }
            return ret;
        },
        matchEnd: function (str) { //find the position of #end
            var reg = /#(foreach|if|end)/g,
                start = 0,
                index = -1,
                result;

            while ((result = reg.exec(str)) !== null) {
                switch (result[1]) {
                case 'foreach':
                case 'if':
                    start += 1;
                    break;
                case 'end':
                    start -= 1;
                    if (start === 0) {
                        index = result.index;
                    }
                    break;
                default:
                    break;
                }

                if (index > -1) {
                    break;
                }
            }

            return index;
        },
        matchElse: function (str) { //find the position of #else
            var reg = /#(foreach|if|else|end)/g,
                start = 0,
                index = -1,
                result;

            while ((result = reg.exec(str)) !== null) {
                switch (result[1]) {
                    case 'foreach':
                    case 'if':
                        start += 1;
                        break;
                    case 'end':
                        start -= 1;
                        break;
                    case 'else':
                        if (start === 1) {
                            index = result.index;
                        }
                        break;
                    default:
                        break;
                }

                if (index > -1) {
                    break;
                }
            }
            return index;
        }
    };

    return {
        render: function (name, params) {
			if (typeof templates[name] !== 'string') {
                util.log('Template ' + name + ' not found!', 'warn');
				return '';
            } else {
                return velocity.parse(templates[name], params);
            }
        },
        define: function (name, template) {
            if (typeof template == 'string') { //string
                templates[name] = template;
            } else { //array
                templates[name] = template.join('');
            }
        }
    };
})();

Template.log = (function () {
    'use strict';
    var debug = window.location.href.indexOf('debug') > -1,
        log = function () {
            var div = document.createElement('div');
            div.style.cssText = 'position:fixed;width:100%;bottom:0;height:120px;border-top:2px solid #ccc;backround-color:#efefef;overflow-y:scroll';
            document.body.appendChild(div);

            log = function (msg, type) {
                var d = document.createElement('div');
                d.style.padding = '4px';
                switch (type) {
                case 'warn':
                    d.style.color = 'red';
                    break;
                case 'info':
                    break;
                }
                d.innerHTML = msg;
                div.appendChild(d);
            };
        };
    if (debug) {
        if (window.console && console.log) {
            return function (msg, type) {
                switch (type) {
                case 'info':
                    console.info(msg);
                    break;
                case 'warn':
                    console.warn(msg);
                    break;
                default:
                    console.log(msg);
                    break;
                }

            };
        } else {
            log();
            return log;
        }
    } else {
        return function () {};
    }
})();
