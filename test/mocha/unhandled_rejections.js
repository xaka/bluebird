"use strict";
var assert = require("assert");
var Promise = require("../../js/debug/bluebird.js");
var adapter = require("../../js/debug/bluebird.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;


//Since there is only a single handler possible at a time, older
//tests that are run just before this file could affect the results
//that's why there is 500ms limit in grunt file between each test
//beacuse the unhandled rejection handler will run within 100ms right now
function onUnhandledFail() {
    Promise.onPossiblyUnhandledRejection(function(e){
        assert.fail("Reporting handled rejection as unhandled");
    });
}

function onUnhandledSucceed( done, testAgainst ) {
    Promise.onPossiblyUnhandledRejection(function(e){
         if( testAgainst !== void 0 ) {
            if( typeof testAgainst === "function" ) {
                assert(testAgainst(e));
            }
            else {
                assert.equal(testAgainst, e );
            }
         }
         onDone(done)();
    });
}

function async(fn) {
    return function() {
        setTimeout(function(){fn()}, 13);
    };
}

function onDone(done) {
    return function() {
        Promise.onPossiblyUnhandledRejection(null);
        done();
    };
};

function e() {
    var ret = new Error();
    ret.propagationTest = true;
    return ret;
}

function notE() {
    var rets = [{}, []];
    return rets[Math.random()*rets.length|0];
}


if( adapter.hasLongStackTraces() ) {
    describe("Will report rejections that are not handled in time", function() {


        specify("Immediately rejected not handled at all", function(done) {
            onUnhandledSucceed(done);
            var promise = pending();
            promise.reject(e());
        });
        specify("Eventually rejected not handled at all", function(done) {
            onUnhandledSucceed(done);
            var promise = pending();
            setTimeout(function(){
                promise.reject(e());
            }, 50);
        });



        specify("Immediately rejected handled too late", function(done) {
            onUnhandledSucceed(done);
            var promise = pending();
            promise.reject(e());
            setTimeout( function() {
                promise.promise.caught(function(){});
            }, 120 );
        });
        specify("Eventually rejected handled too late", function(done) {
            onUnhandledSucceed(done);
            var promise = pending();
            setTimeout(function(){
                promise.reject(e());
            }, 20);
            setTimeout( function() {
                promise.promise.caught(function(){});
            }, 160 );
        });
    });

    describe("Will report rejections that are code errors", function() {

        specify("Immediately fulfilled handled with erroneous code", function(done) {
            onUnhandledSucceed(done);
            var deferred = pending();
            var promise = deferred.promise;
            deferred.fulfill(null);
            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            });
        });
        specify("Eventually fulfilled handled with erroneous code", function(done) {
            onUnhandledSucceed(done);
            var deferred = pending();
            var promise = deferred.promise;
            setTimeout(function(){
                deferred.fulfill(null);
            }, 40);
            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            });
        });

        specify("Already fulfilled handled with erroneous code but then recovered and failed again", function(done) {
            var err = e();
            onUnhandledSucceed(done, err);
            var promise = fulfilled(null);
            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            }).caught(function(e){
                    assert.ok( e instanceof Promise.TypeError )
            }).then(function(){
                //then failing again
                //this error should be reported
                throw err;
            });
        });

        specify("Immediately fulfilled handled with erroneous code but then recovered and failed again", function(done) {
            var err = e();
            onUnhandledSucceed(done, err);
            var deferred = pending();
            var promise = deferred.promise;
            deferred.fulfill(null);
            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            }).caught(function(e){
                    assert.ok( e instanceof Promise.TypeError )
                //Handling the type error here
            }).then(function(){
                //then failing again
                //this error should be reported
                throw err;
            });
        });

        specify("Eventually fulfilled handled with erroneous code but then recovered and failed again", function(done) {
            var err = e();
            onUnhandledSucceed(done, err);
            var deferred = pending();
            var promise = deferred.promise;

            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            }).caught(function(e){
                    assert.ok( e instanceof Promise.TypeError )
                //Handling the type error here
            }).then(function(){
                //then failing again
                //this error should be reported
                throw err;
            });

            setTimeout(function(){
                deferred.fulfill(null);
            }, 40 );
        });

        specify("Already fulfilled handled with erroneous code but then recovered in a parallel handler and failed again", function(done) {
            var err = e();
            onUnhandledSucceed(done, err);
            var promise = fulfilled(null);
            promise.then(function(itsNull){
                itsNull.will.fail.four.sure();
            }).caught(function(e){
                    assert.ok( e instanceof Promise.TypeError )
            });

            promise.caught(function(e) {
                    assert.ok( e instanceof Promise.TypeError )
                //Handling the type error here
            }).then(function(){
                //then failing again
                //this error should be reported
                throw err;
            });
        });
    });

}
describe("Will report rejections that are not instanceof Error", function() {

    specify("Immediately rejected with non instanceof Error", function(done) {
        onUnhandledSucceed(done);

        var failed = pending();
        failed.reject(notE());
    });


    specify("Eventually rejected with non instanceof Error", function(done) {
        onUnhandledSucceed(done);

        var failed = pending();

        setTimeout(function(){
            failed.reject(notE());
        }, 80 );
    });
});

describe("Will handle hostile rejection reasons like frozen objects", function() {

    specify("Immediately rejected with instanceof Error", function(done) {
        onUnhandledSucceed(done, function(e) {
            return true;
        });


        var failed = pending();
        failed.reject(Object.freeze(new Error()));
    });


    specify("Eventually rejected with non instanceof Error", function(done) {
        onUnhandledSucceed(done, function(e) {
            return e instanceof Error;
        });


        var failed = pending();

        setTimeout(function(){
            failed.reject(Object.freeze({}));
        }, 80 );
    });
});

describe("Will not report rejections that are handled in time", function() {


    specify("Already rejected handled", function(done) {
        onUnhandledFail();

        var failed = rejected(e());

        failed.caught(function(){

        });

        setTimeout( onDone(done), 34 );
    });

    specify("Immediately rejected handled", function(done) {
        onUnhandledFail();

        var failed = pending();

        failed.promise.caught(function(){

        });

        failed.reject(e());

        setTimeout( onDone(done), 34 );

    });


    specify("Eventually rejected handled", function(done) {
        onUnhandledFail();

        var failed = pending();

        failed.promise.caught(function(){

        });

        setTimeout(function(){
            failed.reject(e());
        }, 13 );

        setTimeout( onDone(done), 70 );

    });




    specify("Already rejected handled in a deep sequence", function(done) {
        onUnhandledFail();

        var failed = rejected(e());

        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(function(){
            });


        setTimeout( onDone(done), 34 );
    });

    specify("Immediately rejected handled in a deep sequence", function(done) {
        onUnhandledFail();

        var failed = pending();

        failed.promise.then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(function(){

        });


        failed.reject(e());

        setTimeout( onDone(done), 34 );

    });


    specify("Eventually handled in a deep sequence", function(done) {
        onUnhandledFail();

        var failed = pending();

        failed.promise.then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(function(){

        });


        setTimeout(function(){
            failed.reject(e());
        }, 13 );

        setTimeout( onDone(done), 70 );

    });


    specify("Already rejected handled in a middle parallel deep sequence", function(done) {
        var totalReported = 0;
        Promise.onPossiblyUnhandledRejection(function () {
            totalReported++;
            if (totalReported === 2) {
                setTimeout(function(){
                    assert.equal(totalReported, 2);
                    Promise.onPossiblyUnhandledRejection(null);
                    done();
                }, 13);
            }
        });

        var failed = rejected(e());

        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});


        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .caught(function(){
            });

        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});
    });


    specify("Immediately rejected handled in a middle parallel deep  sequence", function(done) {
        var totalReported = 0;
        Promise.onPossiblyUnhandledRejection(function () {
            totalReported++;
            if (totalReported === 2) {
                setTimeout(function(){
                    assert.equal(totalReported, 2);
                    Promise.onPossiblyUnhandledRejection(null);
                    done();
                }, 13);
            }
        });

        var failed = pending();

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .caught(function(){
            });

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failed.reject(e());
    });


    specify("Eventually handled in a middle parallel deep sequence", function(done) {
        var totalReported = 0;
        Promise.onPossiblyUnhandledRejection(function () {
            totalReported++;
            if (totalReported === 2) {
                setTimeout(function(){
                    assert.equal(totalReported, 2);
                    Promise.onPossiblyUnhandledRejection(null);
                    done();
                }, 13);
            }
        });

        var failed = pending();

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .caught(function(){
            });

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});


        setTimeout(function(){
            failed.reject(e());
        }, 13 );

    });
});

describe("immediate failures without .then", function(done) {
    var err = new Error('');
    specify("Promise.reject", function(done) {
        onUnhandledSucceed(done, function(e) {
            return e === err;
        });

        Promise.reject(err);
    });

    specify("new Promise throw", function(done) {
        onUnhandledSucceed(done, function(e) {
            return e === err;
        });

        new Promise(function() {
            throw err;
        });
    });

    specify("new Promise reject", function(done) {
        onUnhandledSucceed(done, function(e) {
            return e === err;
        });

        new Promise(function(_, r) {
            r(err);
        });
    });

    specify("Promise.method", function(done) {
        onUnhandledSucceed(done, function(e) {
            return e === err;
        });

        Promise.method(function() {
            throw err;
        })();
    });
});

describe("immediate failures with .then", function(done) {
    var err = new Error('');
    specify("Promise.reject", function(done) {
        onUnhandledFail();

        Promise.reject(err).caught(async(done));
    });

    specify("new Promise throw", function(done) {
        onUnhandledFail();

        new Promise(function() {
            throw err;
        }).caught(async(done));
    });

    specify("new Promise reject", function(done) {
        onUnhandledFail();

        new Promise(function(_, r) {
            r(err);
        }).caught(async(done));
    });

    specify("Promise.method", function(done) {
        onUnhandledFail();

        Promise.method(function() {
            throw err;
        })().caught(async(done));
    });
});

describe("gh-118", function() {
    specify("eventually rejected promise", function(done) {
        onUnhandledFail();

        Promise.resolve().then(function() {
            return new Promise(function(_, reject) {
                setTimeout(function() {
                    reject(13);
                }, 13);
            });
        }).caught(async(done));
    });

    specify("already rejected promise", function(done) {
        onUnhandledFail();

        Promise.resolve().then(function() {
            return Promise.reject(13);
        }).caught(async(done));
    });

    specify("immediately rejected promise", function(done) {
        onUnhandledFail();

        Promise.resolve().then(function() {
            return new Promise(function(_, reject) {
                reject(13);
            });
        }).caught(async(done));
    });
});

if (Promise.hasLongStackTraces()) {
    describe("Gives long stack traces for non-errors", function() {

        specify("string", function(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });


            new Promise(function(){
                throw "hello";
            });

        });

        specify("null", function(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            new Promise(function(resolve, reject){
                reject(null);
            });

        });

        specify("boolean", function(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            var d = Promise.defer();
            d.reject(true);
        });

        specify("undefined", function(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.cast().then(function() {
                throw void 0;
            });
        });

        specify("number", function(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.cast().then(function() {
                throw void 0;
            }).caught(function(e){return e === void 0}, function() {
                throw 3;
            });
        });

        specify("function", function(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.cast().then(function() {
                return Promise.reject(function(){});
            });
        });

        specify("pojo", function(done) {
            var OldPromise = require("./helpers/bluebird0_7_0.js");

            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.cast().then(function() {
                return OldPromise.rejected({});
            });
        });

        specify("Date", function(done) {
            var OldPromise = require("./helpers/bluebird0_7_0.js");

            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.cast().then(function() {
                return OldPromise.cast().then(function(){
                    throw new Date();
                });
            });
        });

        specify("Q", function(done) {
            onUnhandledSucceed(done, function(e) {
                return (e.stack.length > 100);
            });

            Promise.resolve(5).then(function(val){
                return "Hello";
            }).delay(5).then(function(val){
                return require("q")().then(function(){throw "Error"});
            });
        });
    });
}
