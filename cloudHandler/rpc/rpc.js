var sys = require('util');
var amqp = require('amqp');
var rpcPublic = require('./rpcPublic');

var corrID = 0;
var map = {};
var clientQueue;
var exc;

// Create the amqp connection to rabbitMQ server
var connection = amqp.createConnection({host: 'toronado.dit.upm.es', port: 5672});

connection.on('ready', function () {
	console.log('Conected to rabbitMQ server');

	//Create a direct exchange 
	exc = connection.exchange('rpcExchange', {type: 'direct'}, function (exchange) {
		console.log('Exchange ' + exchange.name + ' is open');

		//Create the queue for receive messages
		var q = connection.queue('nuveQueue', function (queue) {
		  	console.log('Queue ' + queue.name + ' is open');

		  	q.bind('rpcExchange', 'cloudHandler');
	  		q.subscribe(function (message) { 

	    		rpcPublic[message.method](message.args, function(result) {

	    			exc.publish(message.replyTo, {data: result, corrID: message.corrID});
	    		});

	    		
	  		});
		});

		//Create the queue for send messages
		clientQueue = connection.queue('', function (q) {
		  	console.log('ClientQueue ' + q.name + ' is open');

		 	clientQueue.bind('rpcExchange', clientQueue.name);

		  	clientQueue.subscribe(function (message) {
			
				map[message.corrID](message.data);
				delete map[message.corrID];

		  	});

		});
	});

});

/*
 * Calls remotely the 'method' function defined in rpcPublic of 'to'.
 */
exports.callRpc = function(to, method, args, callback) {

	corrID ++;
	map[corrID] = callback;

	var send = {method: method, args: args, corrID: corrID, replyTo: clientQueue.name};
 	
 	exc.publish(to, send);
	
}