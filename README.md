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

