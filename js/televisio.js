/**
	here's how we're gonna do it: get the data raw from TVRage API and process it into a usable state

	then keep a separate //ARRAY// of user data: 
		show id numbers
			season / episode coordinates
				booleans for seen/unseen

**/

$(function() {
	
	Parse.$ = jQuery; //reassign jQuery, god knows why
	Parse.initialize("CI4kTSt4LME3DQopwCpnh4E4yEFwr0fEwYpAeNuF", "kh8MdcK8IcQnTMXzCmUvogxdREWP7eyRv4VGQoVG"); //initialize with login keys

	var Show = Parse.Object.extend("Show",{
		defaults:{
			"classification" : null,
			"country"		 : null,
			"started"		 : null,
			"ended"			 : null,
			"name"			 : null,
			"show_id"		 : null,
			"status"		 : null,
			"num_seasons"    : null,
			"episodes"		 : [],
			"genres"		 : []
		},
		initialize: function(){

		},
		ask: function(s, e){

		},
		toggle: function(s, e){

		}
	});

	var Bools = Parse.Object.extend("Bools",{
		defaults:{
			'show_id': null,
			'seasons': null,
		    'array': 	null,
		    user:   Parse.User.current()
		    // ACL:    new Parse.ACL(Parse.User.current())
		}, 
		initialize: function(){
			this.set({
				array: createArray(this.get('seasons'),0)
			});
		},
		ask: function(s, e){
			return this.array[s][e];
		},
		toggle: function(s, s){
			this.array[s][e] = !this.array[s][e];
		}, 
		seen: function(s, e){
			this.array[s][e] = true;
		},
		unseen: function(s, e){
			this.array[s][e] = false;
		}
	});

	var tab = '';
	var xhr; //one xhr request at a time, friend
	var defaultTab = 'add'; //which tab to open on


	//onboarding, empty, queue, add, settings

	//things to do only once, on startup
	$(document).ready(function() {
		
		$('#tabsblock a').click(function(){
			goToTab($(this).attr('id'));
		});

		goToTab(defaultTab); //initial homepage is queue
		update_navbar_user_stuff();
		getMyShows();

	});

	function getMyShows(){
		var boolsObject = Parse.Object.extend("Bools");
		var boolsQuery = new Parse.Query(boolsObject);
		// boolsQuery.equalTo("playerName", "Dan Stemkoski");
		boolsQuery.find({
			success: function(results){
				console.log('success!');
				console.log(results);
			}
		});
	}

	//i want to keep separate PARSE items on the backend, but have a total array (backbone collection?) on the frontend which i can call from. maybe i should just be saving that? fuck.



//tab stuff

	//navigates to a tab, and changes the .navtabs appearance to match.
	function goToTab(str){
		// console.log('was on ' + tab + ' now on ' + str)
		if (str == tab) {
			return;
		} else {
			tab = str;
			$('main section').hide();
			$('section#'+str).show();
			$('.navtabs a').removeClass('btn-large');
			$('.navtabs a').addClass('btn');
			$('.navtabs a#'+str).toggleClass('btn-large');
			if (str == 'add'){
				add_stage_a();
			} else if (str == 'onboarding'){
				onboarding_init();
			}
		}
	}

	function logMeOut(){
		Parse.User.logOut();
        $('#logio').hide();
        $('#whoami').hide();
		goToTab('onboarding');
	}

// onboarding

	function onboarding_switch(stage){
		$('section#onboarding .card-content').hide();
		$('section#onboarding .card-action a').hide();
		$('section#onboarding .card-action a').unbind();
		onboarding_try_again();
		if(stage=='a'){
			$('section#onboarding .card-content#about').show();
			$('section#onboarding .card-action a#signup').show();
			$('section#onboarding .card-action a#login').show();			
		} else if (stage == 'b'){
			$('section#onboarding .card-content#entry').show();
			$('section#onboarding .card-action a#cancel').show();
			$('section#onboarding .card-action a#cancel').click(function(){
				onboarding_switch('a');
			});
		}
	}

	function onboarding_init(){
		goToTab('onboarding');
		onboarding_switch('a');
		$('section#onboarding .card-action a#login').click(function(){
			onboarding_login();
		});
		$('section#onboarding .card-action a#signup').click(function(){
			onboarding_signup();
		});
	}

	function onboarding_login(){
		$('section#onboarding #entry h5').text('Log In');
		onboarding_switch('b');
		$('section#onboarding .card-action a#login').show();
		$('input#username').focus();

		$("input#password").keyup(function(event){
			if(event.keyCode == 13){ 
				onboarding_collect();
			}
		});

		$("section#onboarding .card-action a#login").click(function(event){
			onboarding_collect();
		});
	}

	function onboarding_signup(){
		$('section#onboarding #entry h5').text('Sign Up');
		onboarding_switch('b');
		$('section#onboarding .card-action a#signup').show();
		$('input#username').focus();

		$("input#password").keyup(function(event){
			if(event.keyCode == 13){ 
				onboarding_collect();
			}
		});

		$("section#onboarding .card-action a#signup").click(function(event){
			onboarding_collect();
		});
	}

	function onboarding_collect(){
		var username = $('section#onboarding input#username').val();
		var password = $('section#onboarding input#password').val();
		var mode = $('section#onboarding #entry h5').text();
		onboarding_parse(username, password, mode);
	}

	function onboarding_parse(username, password, mode){
		if (mode == 'Sign Up'){
			// console.log('signing up: username:' + username + ' password:'+password);
			Parse.User.signUp(username, password, { ACL: new Parse.ACL() }, {
		        success: function(user) {
		        	pushAlert('successful signup');
		        	update_navbar_user_stuff();
		        	goToTab('empty');
		        },

		        error: function(user, error) {
		        	pushAlert(_.escape(error.message));
		        	onboarding_try_again();
		        }
		      });
		} else if (mode == 'Log In'){
			// console.log('logging in: username:' + username + ' password:'+password);
			Parse.User.logIn(username, password, {
		        success: function(user) {
		        	console.log('success login');
		        	update_navbar_user_stuff();
		        	// ^ this toasts
		        	goToTab('empty');
		        },

		        error: function(user, error) {
		        	pushAlert("Invalid username or password. Please try again.");
		        	onboarding_try_again();
		        }
		     });
		}
	}

	function onboarding_try_again(){
		$('section#onboarding input#username').val('');
		$('section#onboarding input#password').val('');
		$('section#onboarding input#username').focus();
	}

// navbar

	function update_navbar_user_stuff(){
		if (Parse.User.current()) {
			//we're logged in
			pushAlert('Logged in as @' + Parse.User.current().attributes.username + '.');
	        
	        $('#logio').show();
	        $('#logio').click(function(){
	        	logMeOut();
	        	pushAlert("Logged out.");
	        });

	        $('#whoami').show();
	        $('#whoami span').text(Parse.User.current().attributes.username);
	        $('#whoami').click(function(){
	        	goToTab('settings');
	        });    		
		} else {
			//we're logged out
	        $('#logio').hide();
	        $('#whoami').hide();
			goToTab('onboarding');
		}
	}

// add

	function add_cancel(){
		add_switch('a');
		xhr.abort();
		pushAlert("Query aborted.");
	}

	function add_switch(stage){
		$('section#add .card-content').hide();
		$('section#add .card-action a').hide();
		$('section#add .card-content#add-content-'+stage).show();
		if(stage=='a'){
			$('section#add .card-action a#add').show();
			$('section#add input#input').val("");
			$('section#add input#input').focus();
		} else {
			$('section#add .card-action a#cancel').show();
			$('section#add .card-action a#cancel').click(function(){
				add_cancel();
			});
		}
	}

	//what's the name of the show?
	function add_stage_a(){
		add_switch('a');
		$("section#add input#input").keyup(function(event){
			if(event.keyCode == 13){ 
				var title = $('section#add input#input').val();
				add_stage_b(title);
			}
		});

		$("section#add .card-action a#add").click(function(event){
			var title = $('section#add input#input').val();
			add_stage_b(title);
		});
	}

	//searching for shows titled
	function add_stage_b(string){
		add_switch('b');
		// console.log(string);
		$('section#add .card-content#add-content-b b').text(string);
		var shortname = string.toLowerCase().replace(/\s/g, '-'); //NICE ONE PLANK
		// $('section#add .card-content#add-content-b span').text(shortname);
		// console.log(shortname);
		//if the string is empty, it's not a mistake 
		if (!shortname){
			pushAlert("Type the name of a show you\'d like to follow\ in the input box.");
			$('section#add input#input').focus();
			add_switch('a');
			return;
		}

		xhr = $.ajax({
			url: 'http://www.jbuckland.com/ketchup.php?func=search&query=' + shortname, 
			// url: 'http://services.tvrage.com/feeds/search.php?show=' + shortname, 
			dataType: "json",
			type: 'GET',
			success: function(data){
				if (data == false){
					//cancel
					add_switch('a');
					pushAlert('Something\'s wrong with the database.');
				} else if (data[0]=="0"){
					// no search results
					add_switch('a');
					pushAlert('No Search Results Found');
				} else {
					//next step
					add_switch('c');
					add_stage_c(string, data);
					// console.log(data);
					pushAlert(data.show.length + ' Results Found');
				}
			}
		});
	}

	//which of these do you mean?
	function add_stage_c(string, data){
		// $('#add-content-c h5 b').text(string);
	  	var template = _.template( 
	  		$('#search-results-template').html()
  		);
	  	var templateData = { results: data.show };

		$("#add-content-c span").html( template(templateData) );

		$("#add-content-c .collection a").click(function(){
			var id = $(this).attr('id');
			var show = _.findWhere(data.show, {showid: id});
			add_stage_d(show);
		});
	}

	//where are you at?
	function add_stage_d(show){
		add_switch('d');
		$('#add-content-d h5 b').text(show['name']);
		console.log(show);

		$('div#add-content-d a#full').click(function(){
			tryShow(show, true);
		});
		$('div#add-content-d a#part').click(function(){
			add_stage_e(show);
		});
		$('div#add-content-d a#empty').click(function(){
			tryShow(show, true);
		});
	}

	//how far exactly?
	function add_stage_e(show){
	}

// try and create SHOW models

	function tryShow(showObj, seen){
		//determine if the show exists or not
		//and create it if it does
		var query = new Parse.Query(Parse.Object.extend("Show"));
		query.equalTo("show_id", parseInt(showObj.showid));
		query.find({
		  success: function(results) {
		  	console.log('Got results from the parse query. Here they are.');
		  	console.log(results);
		  	//if the show doesn't exist
		  	if (results.length == 0){
			    console.log("Didn't find any. Creating own.");
				var showModel = new Show({
					'show_id' : parseInt(showObj.showid),
					'num_seasons' : parseInt(showObj.seasons),
					'name' : String(showObj.name),
					'classification' : String(showObj.classification),
					'country' : String(showObj.country),
					'ended' : String(showObj.ended),
					'started' : String(showObj.started),
					'status' : String(showObj.status)
				});
				showModel.save({
					success: function(){
			    		add_switch('a');
			    		pushAlert("Added '"+showModel.get('name')+"'.");
						getEpisodes(showModel, seen);
					},
					error: function(error){
						console.log('Didn\'t Save Show');
						console.log(error);
						console.log('error.code ' + error.code + error.message);
					}
				});

		  	} else { //if it does already exist

			    console.log("Successfully retrieved " + results.length + " scores. Here's the first.");
			    
			    var showModel = _.first(results);
	    		getEpisodes(showModel, seen);
			    
			    console.log(showModel);
	    		
	    		add_switch('a');
	    		pushAlert("Added '"+showModel.get('name')+"'.")
		  	}
		  },
		  error: function(error) {
		    console.log("Error: " + error.code + " " + error.message);
		  }
		});
	}

// episodes handling functions

	function getEpisodes(showModel, seen){
		console.log('getting episodes by model');
		$.ajax({
			url: 'http://www.jbuckland.com/ketchup.php?func=show&query=' + showModel.get('show_id'), 
			dataType: "json",
			type: 'GET',
			success: function(data){

				processedData = processEpisodes(data);

				showModel.set('episodes', processedData);
				showModel.save();

				tryBools(showModel, seen);

			}
		});
	}

	function processEpisodes(data){
		console.log(data);
		console.log('processing episodes');
		var result = [];
		if ( data.totalseasons == 1 ){ //weird case
			result[0] = [];
			for (var i = 0; i < data.Episodelist.Season.episode.length; i++){
				result[0][i] = {};
				result[0][i]['airdate'] = data.Episodelist.Season.episode[i].airdate;
				result[0][i]['epnum'] = data.Episodelist.Season.episode[i].epnum;
				result[0][i]['seasonnum'] = data.Episodelist.Season.episode[i].seasonnum;
				result[0][i]['title'] = data.Episodelist.Season.episode[i].title;
			}
		} else { //normal case
			for (var i = 0; i < data.totalseasons; i++){
				result[i] = [];
				for (var j = 0; j < data.Episodelist.Season[i].episode.length; j++){
					result[i][j] = {};
					result[i][j]['airdate'] = data.Episodelist.Season[i].episode[j].airdate;
					result[i][j]['epnum'] = data.Episodelist.Season[i].episode[j].epnum;
					result[i][j]['seasonnum'] = data.Episodelist.Season[i].episode[j].seasonnum;
					result[i][j]['title'] = data.Episodelist.Season[i].episode[j].title;
				}
			}
		}
		return result;
	}

// try and create BOOLS models

	function tryBools(showModel, seen){

		var query = new Parse.Query(Parse.Object.extend("Bools"));
		
		query.equalTo("show_id", parseInt(showModel.get('show_id')));
		query.equalTo("user", Parse.User.current());
		
		query.find({
		  success: function(results) {
		  	console.log('Got results from the parse query. Here:');
		  	console.log(results);

		  	//if the show doesn't exist, make our own

		  	if (results.length == 0){
			    console.log("Didn't find any boolean results. Creating own.");
				var temp = new Bools({
					'show_id' : parseInt(showModel.get('show_id')),
					'seasons' : parseInt(showModel.get('num_seasons'))
				});


				// console.log('empty is ' + status);
				// console.log('loooking for episodes')
				// console.log(showModel.get('episodes'));

				var eps = showModel.get('episodes');
				var array = createArray(temp.get('seasons'),0);
				for (var i = 0; i < eps.length; i++){
					for (var j = 0; j < eps[i].length; j++){
						array[i][j] = seen;
					}
				}

				temp.set({
					'array' : array
				});

				temp.save({
					success: function(){
						console.log('Successfully created a BOOLS with id: ' + showModel.get('show_id') + '.');
					},
					error: function(error){
						console.log('Didn\'t Save Bools');
						console.log(error);
						console.log('error.code ' + error.code + error.message);

					}
				});

		  	} else { //if it does, use it

			    console.log("Successfully retrieved " + results.length + " bools. Here's the first.");
			    var result = _.first(results);
			    console.log(result);
		  	}
		  },
		  error: function(error) {
		    console.log("Error: " + error.code + " " + error.message);
		  }
		});
	}


//general use

	//pushes an alert to the box in the corner
	function pushAlert(str){
	  Materialize.toast(str, 3000);
	}

	function createArray(length) {
	    var arr = new Array(length || 0),
	        i = length;

	    if (arguments.length > 1) {
	        var args = Array.prototype.slice.call(arguments, 1);
	        while(i--) arr[length-1 - i] = createArray.apply(this, args);
	    }

	    return arr;
	}


});