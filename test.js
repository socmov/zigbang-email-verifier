const _ = require('lodash');

const greet = (greeting, punctuation) => {
  function aaa() {
    console.log(aa);
  };
  return greeting + ' ' + this.user + punctuation;
};

function aaa() {
  this.aaa;
}



var object = { 'user': 'fred' };

var bound = _.bind(greet, object, 'hi');
console.log(bound('!'));
// => 'hi fred!'

// Bound with placeholders.
var bound = _.bind(greet, object, _, '!');
console.log(bound('hi'));
// => 'hi fred!'

aaa();