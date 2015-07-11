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

	var UserData = Parse.Object.extend("UserData",{
		defaults:{
		    bools: 	{},
		    showid: 0,
		    user:   Parse.User.current(),
		    ACL:    new Parse.ACL(Parse.User.current())
		}
	});

	var TVShowModel = Parse.Object.extend("TVShowModel", {
		defaults: {
		    user:    Parse.User.current()
		    // ACL:     new Parse.ACL(Parse.User.current())
		},
		initialize:  function(){
		  if (!this.get("lastUpdated")) {
		    this.set({"lastUpdated": Date.today()});
		  }
		},
		render: function(){

		}
	});

	var TVShowCollection = Parse.Collection.extend({model: TVShowModel });

	var myTVShows = new TVShowCollection();


	var tab = '';
	var xhr; //one xhr request at a time, friendo
	var defaultTab = 'settings'; //which tab to open on
	var myData = new UserData();
	//onboarding, empty, queue, add, settings

	//things to do only once, on startup
	$(document).ready(function() {
		
		$('#tabsblock a').click(function(){
			goToTab($(this).attr('id'));
		});

		goToTab(defaultTab); //initial homepage is queue
		update_navbar_user_stuff();

		// getUserDataFromParse();
		// setSampleUserDataToParse();
		// console.log(myData.get('data'));

	});

//data handling test functions

	// function getUserDataFromParse(){
	// 	console.log('getting user data from parse');
	// 	var q = new Parse.Query(UserData);
	// 	q.equalTo("user", Parse.User.current());
	// 	q.find({
	// 	  success: function(results) {
	// 	    console.log("Successfully retrieved " + results.length + " scores.");
	// 	    myData.set('bools', _.first(results).get('bools') );
	// 	    console.log(aShow.get('bools'));
	// 	  },
	// 	  error: function(error) {
	// 	    console.log("Error: " + error.code + " " + error.message);
	// 	  }
	// 	});
	// 	console.log(q);
	// }
	// function defineSampleData(){
	// 	var data = {};
	// 	_.each(_.range(3),function(i){
	// 		data[i] = [];
	// 		_.each(_.range(2),function(j){
	// 			data[i][j] = false;
	// 		});
	// 	});
	// 	console.log(data);
	// 	return data;
	// }
	// function setSampleUserDataToParse(){
	// 	console.log('setting user data to parse');
	// 	aShow.set('bools', defineSampleData());
	// 	aShow.set('showid', 12345);
	// 	aShow.save();
	// }

	// $('#updatebutton').click(function(){updateData()});
	
	// function updateData(){
	// 	var tempdata = aShow.get('bools');
	// 		// console.log(tempdata);
	// 	tempdata["56789"] = ['1', '2', '3'];
	// 		// console.log(tempdata);
	// 	aShow.set('bools', tempdata)
	// 	aShow.save({success: function(){
	// 		console.log('successful updateData save');			
	// 	}});
	// }



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

	//the input stage - type the string and hit submit
	function add_stage_b(string){
		add_switch('b');
		// console.log(string);
		$('section#add .card-content#add-content-b span').text(string);
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

	function add_stage_c(string, data){
		$('#add-content-c h5 i').text(string);
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
	function add_stage_d(show){
		add_switch('d');
		$('#add-content-d h5 i').text(show['name']);
		console.log(show);
	}
	function add_stage_e(){

	}


	//pushes an alert to the box in the corner
	function pushAlert(str){
	  Materialize.toast(str, 3000);
	}

});