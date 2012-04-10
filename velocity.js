app.Template = (function (undefined) {
    'use strict';
    var util = app.Util,
        templates = {},
        SENTENCE = /#([a-z]+)\(([\s\S]+?)\)/,
        VARIABLE = /\$\{\w[\w\.]*\}/g,
        velocity;

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
        parseSet: function (str, params, result) { //解析#set
            var start = result.index,
                end = start + result[0].length,
                expression = result[2];

            if (expression.indexOf('=') > -1) {
                expression = expression.split('=');
                params[expression[0].slice(2, -1)] = this.express(expression[1], params);
            } else {
                app.Log('#set 语法错误', 'warn');
            }
            str = str.slice(0, start) + str.slice(end);
            return str;
        },
        parseIf: function (str, params, result) { //解析#if
            var flag = this.express(this.velocityToVariable(result[2], params), params),
                start = result.index,
                middle = this.matchElse(str),
                end = this.matchEnd(str);

            if (end === -1) {
                app.Log('语法错误，缺少#end', 'warn');
                return str;
            }

            //#if(expression) 长度=5+expression.length
            //#end 长度=4
            //#else 长度=5
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
        //#foreach(expression) 长度=10+expression.length
        //#end 长度=4
        parseForeach: function (str, params, result) { //解析#foreach
            var start = result.index,
                end = this.matchEnd(str),
                context = str.slice(start + result[2].length + 10, end),
                arr = result[2].split(' in '),
                list, item, html = '';

            if (arr.length !== 2) {
                app.log('语法错误: ' + result[0], 'error');
                return str;
            }

            item = util.trim(arr[0]).slice(1);
            list = params[util.trim(arr[1]).slice(1)]

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
        parseMacro: function(str, params, result){ //解析#macro
            var start = result.index,
                end = start + result[0].length,
                ret = '', func,
                arr = [];
            
            //过滤空格，计算变量值
            util.each(result[2].split(' '), function(v, index){
                if (!util.isEmpty(v)) {
                    if (index > 0) {
                        arr.push(velocity.getVariable(util.trim(v).slice(2, -1), params));
                    } else {
                        arr.push(util.trim(v));
                    }
                    
                }
            });
            
            func = arr[0];
            if (func) {
                func = params[func];
                if (func) {
                    ret = func.apply(null, arr.slice(1)) || '';
                } else {
                    app.Log('#macro ' + arr[0] + ' 未定义',  'error');
                }
            } else {
                app.Log('#macro 语法错误，缺少宏名称', 'error')
            }
            str = str.slice(0, start) + ret + str.slice(end);
            return str;
        },
        clone: function () { //抄写对象
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
        express: function (expression, params) { //计算表达式
            return eval('(' + expression + ')');
        },
        velocityToVariable: function (str, params) { //将velocity转换成JS
            str = str.replace(VARIABLE, function (all) {
				return 'params.' + all.slice(2, -1);
            });
            return str;
        },
        replaceVariable: function (str, params) { //显示velocity变量
            str = str.replace(VARIABLE, function (all) {
                var name = all.slice(2, -1),
                    value = velocity.getVariable(name, params);

                if (value !== undefined) {
                    return value;
                } else {
                    app.Log('变量 ' + all + '不存在', 'warn');
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
                    if (ret[arr[i]] !== undefined) {
                        ret = ret[arr[i]];
                    } else {
                        app.Log('变量 ' + name + ' 不存在', 'warn');
                        ret = '';
                        break;
                    }
                }
            }
            return ret;
        },
        matchEnd: function (str) { //匹配查找#end的位置
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
        matchElse: function (str) { //匹配查找#else的位置
            var reg = /#(if|else|end)/g,
                start = 0,
                index = -1,
                result;

            while ((result = reg.exec(str)) !== null) {
                switch (result[1]) {
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
                app.Log('Template ' + name + ' not found!', 'warn');
				return '';
            } else {
                return velocity.parse(templates[name], params);
            }
        },
        define: function (name, template) {
            if (typeof template == 'string') {
                templates[name] = template;
            } else { //数组
                templates[name] = template.join('');
            }
        }
    };
})();