#jsVelocity - An JavaScript Template Engine of Velocity


## Where to Use?

You can use velocity.js rendering stuff in various scenarios. E.g. you can
render templates in your browser.


## Usage

A quick example how to use velocity.js:

    Template.define('t1', [
        '#set(${name}="vapour")',
        '#if(${name})',
        '<div>${name}</div>',
        '#end',
        '<ul>',
        '#foreach(${web} in ${website})',
        '<li>${web.name} : ${web.url}</li>',
        '#end',
        '</ul>'
    ]);
    
    var html = Template.render('t1', {
        website: [{
          name: 'google',
          url: 'http://www.google.com/'
        }, {
          name: 'yahoo',
          url: 'http://www.yahoo.com/'
        }, {
          name: 'facebook',
          url: 'http://www.facebook.com/'
        }, {
          name: 'twitter',
          url: 'http://www.twitter.com/'
        }]
    });

### variables

variables are always surrounded by curly brace like this ${name}.

    Template.define('t1', [
        '<div>${name}</div>',
        '<div>${web}</div>'
    ]);
    var html = Template.render('t1', {
        name: 'vapour',
        web: 'http://www.dovapour.info/' 
    });


### #set

to assign a value to a variable

    Template.define('t1', [
        '#set(${name}="vapour")',
        '<div>${name}</div>',
        '<div>${web}</div>'
    ]);
    var html = Template.render('t1', {
       web: 'http://www.dovapour.info/' 
    });

### #if #else #end

Conditional expression begin with `#if` and end with
`#end`. When `condition` evaluates to true, the true section is rendered,
otherwise the false section will output.

    Template.define('t1', [
        '#set(${name}="vapour")',
        '#if(${name})',
        '<div>${name}</div>',
        '#else',
        '<div>${web}</div>',
        '#end'
    ]);
    var html = Template.render('t1', {
       web: 'http://www.dovapour.info/' 
    });

### #foreach && #macro

    Template.define('t1', [
        '<ul>',
        '#foreach(${web} in ${website})',
        '<li>${velocityCount} ${web.name} : ${web.url} #macro(isGoogle ${web.name})</li>',
        '#end',
        '</ul>'
    ]);
        
    var html = Template.render('t1', {
        website: [{
            name: 'google',
            url: 'http://www.google.com/'
        }, {
            name: 'yahoo',
            url: 'http://www.yahoo.com/'
        }, {
            name: 'facebook',
            url: 'http://www.facebook.com/'
        }, {
            name: 'twitter',
            url: 'http://www.twitter.com/'
        }],
        isGoogle: function(name){
            return name === 'google' ? ', is google' : '';
        }
    });


