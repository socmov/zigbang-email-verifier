'use strict';

const zbEmailVerifier = require('./index');

zbEmailVerifier.verify({
  helo: 'zigbang.com',
  from: 'cs@zigbang.com',
  //to: 'WilmaSBarrios@jourrapide.com',
  to: 'ghfkdol01@hanmail.net',
  debug: true,
  timeout: 1000
}).then(result => {
  console.log(result);

  if(result === 'EXIST') {
    console.log(checkEmail + ' is existence email');
  } else if(result === 'NOT_EXIST' || result === 'MXRECORD_FAIL') {
    console.log(checkEmail + ' is not existence email');
  } else {
    console.log(checkEmail + ' is unknown existence email');
  }

  // this result is not 100% accura.

  // EXIST
  // NOT_EXIST

  // INVALID
  // MXRECORD_TIMEOUT
  // MXRECORD_FAIL
  // CONN_FAIL
  // CONN_TIMEOUT
  // VERIFY_TIMEOUT
  // VERIFY_FAIL
  // UNKNOWN


});
