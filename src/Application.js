import device;
import ui.View as View;
import ui.TextView as TextView;

exports = Class(GC.Application, function () {

	this.initUI = function () {
		// start button
		this.startBtn = new TextView({
			superview: this,
			layout: 'box',
			color: 'white',
			text: 'start',
			size: 50
		});
		this.startBtn.on('InputStart', bind(this, 'connect'));

		/*
		 * game stuff
		 */
		this.game = new View({
			superview: this,
			layout: 'box',
			canHandleEvents: false,
			visible: false
		});

		// TOP ROW: 7 letters to choose from
		this.letters = [];
		var w = device.width / 7;
		var letterBox = bind(this, function(num) {
			var tv = new TextView({
				superview: this.game,
				backgroundColor: 'red',
				size: 50,
				x: 5 + num * w,
				y: 5,
				width: w - 10,
				height: w - 10
			});
			tv.on('InputStart', bind(this, 'tapLetter', num));
			return tv;
		});
		for (var i = 0; i < 7; i++) {
			this.letters.push(letterBox(i));
		}

		// MIDDLE ROW: log view
		this.logView = new TextView({
			superview: this.game,
			layout: 'box',
			backgroundColor: 'white',
			color: 'black',
			size: 50,
			height: w,
			centerY: true
		});

		// BOTTOM ROW: 3 buttons
		// skip (new letters)
		this.skipBtn = new TextView({
			superview: this.game,
			layout: 'box',
			backgroundColor: 'green',
			text: 'SKIP',
			size: 50,
			height: w,
			width: w * 2,
			left: 0,
			bottom: 0
		});
		this.skipBtn.on('InputStart', bind(this, 'skip'));

		// word being built (tap to send)
		this.word = new TextView({
			superview: this.game,
			layout: 'box',
			backgroundColor: 'pink',
			text: '',
			size: 50,
			height: w,
			width: w * 3,
			bottom: 0,
			centerX: true
		});
		this.word.on('InputStart', bind(this, 'submit'));

		// cancel word in progress
		this.cancelBtn = new TextView({
			superview: this.game,
			layout: 'box',
			backgroundColor: 'blue',
			text: 'CANCEL',
			size: 50,
			height: w,
			width: w * 2,
			right: 0,
			bottom: 0
		});
		this.cancelBtn.on('InputStart', bind(this, 'cancel'));
	};

	this.log = function(data) {
		// strip out HTML tags sent by server expecting web client endpoint
		data = data.replace(/<b>/g, '').replace(/<\/b>/g, '');
		logger.log(data);
		this.logView.setText(data);
	};

	this.send = function(data) {
		this.log('sending: ' + data);
		this.sock.send(data + ":");
	};

	/*
	 * input event callbacks
	 */
	this.skip = function() {
		this.send("!");
	};

	this.cancel = function() {
		for (var i = 0; i < 7; i++) {
			this.letters[i].setText(this.letters[i].__letter);
		}
		this.word.setText("");
	};

	this.submit = function() {
		var w = this.word.getText();
		if (w.length > 2) {
			this.cancel();
			this.send(w);
		}
	};

	this.tapLetter = function(num) {
		this.word.setText(this.word.getText() + this.letters[num].getText());
		this.letters[num].setText("");
	};

	this.connect = function() {
		this.log("connect");
		import gc.native.socketTransport as socketTransport;
		this.sock = new socketTransport.Socket('mariobalibrera.com', 9999);
		this.sock.reader.setMode('json');
		this.sock.onError = bind(this, 'onError');
		this.sock.onClose = bind(this, 'onClose');
		this.sock.onConnect = bind(this, 'onConnect');
		this.sock.onRead = bind(this, 'onRead');
	};

	/*
	 * socket event callbacks
	 */
	this.onError = function(e) {
		this.log("error: " + e);
	};

	this.onClose = function() {
		this.log("close");
	};

	this.onConnect = function() {
		this.log("connected");
		this.send('player' + ~~(Math.random() * 1000));
	};

	// event router
	this.onRead = function(data) {
	    switch(data[0]) {
	        case "SCORE": this.score(data[1]); break;
	        case "WORD": this.newLetters(data[1]); break;
	        case "ALERT": this.log(data[1]); break;
	        case "JOIN": this.join(data[1]); break;
	        case "LEAVE": this.leave(data[1]); break;
	        case "WELCOME": this.welcome(data[1]); break;
	        case "SIGNEDIN": this.signedin(); break;
	    }
	};

	/*
	 * read event handlers
	 */
	this.newLetters = function(data) {
		for (var i = 0; i < 7; i++) {
			this.letters[i].__letter = data[i];
			this.letters[i].setText(data[i]);
		}
	};

	this.score = function(data) {
		this.log(data[0] + " has " + data[1] + " points!");
	};

	this.join = function(data) {
		this.log(data[0] + " joined!");
	};

	this.leave = function(data) {
		this.log(data + " left!");
	};

	this.welcome = function(data) {
		this.log('welcome: ' + data);
		this.newLetters(data[0]);
	};

	this.signedin = function() {
		this.startBtn.removeFromSuperview();
		this.game.canHandleEvents(true);
		this.game.show();
	};
});