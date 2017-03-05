const request = require('request')
const crypto = require('crypto');
const querystring = require('querystring');


function LBCClient(key, secret, otp) {
	let nonce = new Date() * 1000;
	var self = this;

	var config = {
		url: 'https://localbitcoins.com/api',
		key: key,
		secret: secret,
		otp: otp,
		timeoutMS: 5000
	};

	/**
	 * This method makes a public or private API request.
	 * @param  {String}   method   The API method (public or private)
	 * @param  {Object}   params   Arguments to pass to the api call
	 * @param  {Function} callback A callback function to be executed when the request is complete
	 * @return {Object}            The request object
	 */
	function api(method, ad_id, params, callback) {
		nonce = new Date() * 10000;
		
		let methods = {
			onlineAds: ['buy-bitcoins-online', 'sell-bitcoins-online'],
			public: ['countrycodes'],
			private: ['ad-get', 'ad-get/ad_id', 'myself', 'ads', 'ad',
			'dashboard', 'dashboard/released', 'dashboard/canceled', 'dashboard/closed',
			'dashboard/released/buyer', 'dashboard/canceled/buyer', 'dashboard/closed/buyer',
			'dashboard/released/seller', 'dashboard/canceled/seller', 'dashboard/closed/seller',
			'wallet-send', 'wallet', 'contact_info'
			]
		};

		if(methods.onlineAds.indexOf(method) !== -1) {
			return onlineAdsMethod(method, params, ad_id, callback);
		}
		else if(methods.public.indexOf(method) !== -1) {
			return publicMethod(method, params, ad_id, callback);
		}
		else if(methods.private.indexOf(method) !== -1) {
			return privateMethod(method, params, ad_id, callback);
		}
		else {
			throw new Error(method + ' is not a valid API method.');
		}
	}

	/**
	 * This method makes a onlineAds API request.
	 */
	function onlineAdsMethod(method, params, ad_id, callback) {
		params = params || {}

		var url = `https://localbitcoins.com/${method}/${params.path}/.json`;

		return rawRequest(url, {}, params, method, callback);
	}

	/**
	 * This method makes a public API request.
	 * @param  {String}   method   The API method (public or private)
	 * @param  {Object}   params   Arguments to pass to the api call
	 * @param  {Function} callback A callback function to be executed when the request is complete
	 * @return {Object}            The request object
	 */
	function publicMethod(method, params, ad_id, callback) {
		params = params || {};

		var path;
		if (ad_id) {
			path = '/' + method + '/' + ad_id;
		} else {
			path = '/' + method;
		}

		var url = config.url + path;

		return rawRequest(url, headers, params, method, callback);
	}

	/**
	 * This method makes a private API request.
	 * @param  {String}   method   The API method (public or private)
	 * @param  {Object}   params   Arguments to pass to the api call
	 * @param  {Function} callback A callback function to be executed when the request is complete
	 * @return {Object}            The request object
	 */
	function privateMethod(method, params, ad_id, callback) {
		params = params || {};

		var path;

		if (ad_id) {
			path	= '/' + method + '/' + ad_id;
		} else {
			path	= '/' + method;
		}

		var url = config.url + path;

		var signature = getMessageSignature(path, params, nonce);

		var headers = {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Apiauth-Key': config.key,
			'Apiauth-Nonce': nonce,
			'Apiauth-Signature': signature
		};

		return rawRequest(url, headers, params, method, callback);
	}

	/**
	 * This method returns a signature for a request as a Base64-encoded string
	 * @param  {String}  path    The relative URL path for the request
	 * @param  {Object}  params The POST body
	 * @param  {Integer} nonce   A unique, incrementing integer
	 * @return {String}          The request signature
	 */
	function getMessageSignature(path, params, nonce) {
		if (params && params.msg) {
			params.msg = params.msg.replace(/[!'()*]/g, function(c) {
				return '%' + c.charCodeAt(0).toString(16);
			});
		}
		let postParameters = querystring.stringify(params);
		path = '/api' + path + '/';
		let message = nonce + config.key + path + postParameters;
		let auth_hash = crypto.createHmac("sha256", config.secret).update(message).digest('hex').toUpperCase();
		return auth_hash;
	}

	/**
	 * This method sends the actual HTTP request
	 * @param  {String}   url      The URL to make the request
	 * @param  {Object}   headers  Request headers
	 * @param  {Object}   params   POST body
	 * @param  {Function} callback A callback function to call when the request is complete
	 * @return {Object}            The request object
	 */
	function rawRequest(url, headers, params, method, callback) {

    var gets = ['ad-get', 'dashboard', 'dashboard/released', 'dashboard/canceled',
    'dashboard/closed', 'dashboard/released/buyer', 'dashboard/canceled/buyer',
    'dashboard/closed/buyer', 'dashboard/released/seller', 'dashboard/canceled/seller',
    'dashboard/closed/seller', 'wallet', 'contact_info'];
    var posts = [ 'ad-get/ad_id', 'myself', 'ads', 'ad',
    'wallet-send', 'wallet-balance', 'wallet-addr'];

    if (posts.indexOf(method) !== -1) {

			let options = {
				url: url + '/',
				headers: headers,
				form: params,
			};

			let req = request.post(options, function(error, response, body) {
				if(typeof callback === 'function') {
					let data;

					if(error) {
						callback.call(self, new Error('Error in server response: ' + JSON.stringify(error)), null);
						return;
					}

					try {
						data = JSON.parse(body);
					}
					catch(e) {
						callback.call(self, new Error('Could not understand response from server: ' + body), null);
						return;
					}

					if(data.error) {
						callback.call(self, data.error, null);
					}
					else {
						callback.call(self, null, data);
					}
				}
			});

			return req;

		} else {

			let options = {
				url: url,
				headers: headers,
			};

			let req = request.get(options, function(error, response, body) {

				if(typeof callback === 'function') {
					let data;

					if(error) {
						callback.call(self, new Error('Error in server response: ' + JSON.stringify(error)), null);
						return;
					}

					try {
						data = JSON.parse(body);
					}
					catch(e) {
						callback.call(self, new Error('Could not understand response from server: ' + body), null);
						return;
					}

					if(data.error) {
						callback.call(self, data.error, null);
					}
					else {
						callback.call(self, null, data);
					}
				}
			});

			return req;
		}
	}

	self.api = api;
	self.publicMethod	= publicMethod;
	self.privateMethod = privateMethod;
}

module.exports = LBCClient;
