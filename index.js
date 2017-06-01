'use strict';

const dns = require('dns');
const P = require('bluebird');
const _ = require('lodash');
const netsend = require('./lib/netsend');

class VerifyError extends Error {
  constructor(message, extra) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = 'CustomError';
    this.message = message;
    if(extra) this.extra = extra;
  }
}
P.config({cancellation: true});

const dnsResolveMx = P.promisify(dns.resolveMx, {context: dns});

module.exports = {
  verify(opts) {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; // eslint-disable-line

    if(!emailRegex.test(opts.to)) {
      return P.resolve('INVALID');
    }

    const emailSplited = opts.to.split('@');
    const emailHost = emailSplited[1];

    const debug = opts.debug ? (_.isFunction(opts.debug) ? opts.debug : console.info) : () => {};
    const timeout = opts.timeout ? opts.timeout : 5000;

    const defaultCheckAllCheckEmailUser = 'j598gskdi39ffkels3fmbjh84ndq3gb-234';

    const checkCatchAll = _.cond([
      [_.isNil, _.stubFalse],
      [v => v === true, _.constant(defaultCheckAllCheckEmailUser + '@' + emailHost)],
      [v => _.isString(v) && v.length > 0, v => v + '@' + emailHost],
      [_.stubTrue, _.stubFalse]
    ])(opts.checkCatchAll);

    return new P((resolve, reject) => {
      const jobDnsResolveMx = dnsResolveMx(emailHost).then(results => {
        if(_.isEmpty(results)) {
          throw new VerifyError('', 'MXRECORD_FAIL');
        }
        return results;
      }, () => {
        throw new VerifyError('', 'MXRECORD_FAIL');
      });

      const jobNetConnect = jobDnsResolveMx.then(results => {
        debug('RESOLVE MX RECORD');

        const exchange = _(results).sortBy(v => v.priority).take(1).value()[0].exchange;
        debug('\t' + exchange);

        return netsend({port: 25, host: exchange}).catch(() => {
          throw new VerifyError('', 'CONN_FAIL');
        });
      });

      const jobMailVerify = jobNetConnect.bind({netConn:null}).then(function(netConn) {
        this.netConn = netConn;
      }).then(function(){
        debug('CONNECTED SMTP SERVER');

        return this.netConn.response();
      }).then(function(resmsg){
        debug('\t' + resmsg[0]);

        if(resmsg[0].substr(0, 3) !== '220') {
          throw new VerifyError('', 'VERIFY_FAIL');
        }

        const writeMsg = 'HELO ' + opts.helo;
        debug(writeMsg);
        this.netConn.write(writeMsg);

        return this.netConn.response();
      }).then(function(resmsg) {
        debug('\t' + resmsg[0]);

        if(resmsg[0].substr(0, 3) !== '250') {
          throw new VerifyError('', 'VERIFY_FAIL');
        }

        const writeMsg = `MAIL FROM: <${opts.from}>`;
        debug(writeMsg);
        this.netConn.write(writeMsg);

        return this.netConn.response();
      }).then(function(resmsg) {
        debug('\t' + resmsg[0]);

        if(resmsg[0].substr(0, 3) !== '250') {
          throw new VerifyError('', 'VERIFY_FAIL');
        }
        const writeMsg = `RCPT TO: <${opts.to}>`;
        debug(writeMsg);
        this.netConn.write(writeMsg);

        return this.netConn.response();
      }).then(function(resmsg) {
        debug('\t' + resmsg[0]);
        if(resmsg[0].substr(0, 3) === '250') {
          return 'EXIST';
        } else {
          return 'NOT_EXIST';
        }
      });

      const jobMailCatchall = jobMailVerify.then(result => {
        if(result === 'EXIST' && checkCatchAll) {
          const writeMsg = `RCPT TO: <${checkCatchAll}>`;
          debug(writeMsg);
          netConn.write(writeMsg);

          return this.netConn.response().then(function(resmsg) {
            if(resmsg[0].substr(0, 3) === '250') {
              return 'CATCHALL';
            } else {
              return 'EXIST';
            }
          });
        } else {
          return result;
        }
      });



      const jobVerify = jobNetConnect.then(netConn => {
        debug('CONNECTED SMTP SERVER');

        return netConn.response().then(resmsg => {
          debug('\t' + resmsg[0]);

          if(resmsg[0].substr(0, 3) !== '220') {
            throw new VerifyError('', 'VERIFY_FAIL');
          }

          const writeMsg = 'HELO ' + opts.helo;
          debug(writeMsg);
          netConn.write(writeMsg);

          return netConn.response();
        }).then(resmsg => {
          debug('\t' + resmsg[0]);

          if(resmsg[0].substr(0, 3) !== '250') {
            throw new VerifyError('', 'VERIFY_FAIL');
          }

          const writeMsg = `MAIL FROM: <${opts.from}>`;
          debug(writeMsg);
          netConn.write(writeMsg);

          return netConn.response();
        }).then(resmsg => {
          debug('\t' + resmsg[0]);

          if(resmsg[0].substr(0, 3) !== '250') {
            throw new VerifyError('', 'VERIFY_FAIL');
          }
          const writeMsg = `RCPT TO: <${opts.to}>`;
          debug(writeMsg);
          netConn.write(writeMsg);

          return netConn.response();
        }).then(resmsg => {
          debug('\t' + resmsg[0]);
          debug('\t' + resmsg[0]);
          if(resmsg[0].substr(0, 3) === '250') {
            return 'EXIST';
          } else {
            return 'NOT_EXIST';
          }
        }).then(result => {
          if(result === 'EXIST' && checkCatchAll) {
            const writeMsg = `RCPT TO: <${opts.to}>`;
            debug(writeMsg);
            netConn.write(writeMsg);

            return
          } else {
            return result;
          }
        }).finally(() => {
          netConn.end();
        });
      });

      // EXIST_CATCHALL_TIMEOUT
      // CATCHALL
      //



      const mainJob = jobVerify.then(results => {
        resolve(results);
      }).catch(VerifyError, (err) => {
        resolve(err.extra);
      }).catch((err) => {
        debug(err);
        resolve('UNKNOWN');
      });

      const mainJobTimeout = setTimeout(() => {
        mainJob.cancel();

        if(jobDnsResolveMx.isPending()) {
          return resolve('MXRECORD_TIMEOUT');
        }

        if(jobNetConnect.isPending()) {
          return resolve('CONN_TIMEOUT');
        }

        if(jobVerify.isPending()) {
          return resolve('VERIFY_TIMEOUT');
        }

        return resolve('UNKNOWN');
      }, timeout);

      mainJob.finally(() => {
        if(!mainJob.isCancelled()) {
          clearTimeout(mainJobTimeout);
        }
      });
    });
  }
};
