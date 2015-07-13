//TODO

//better handling for queue + manage when EMPTY
//airdate-dependent coloring and presentation
//ability to load in new tvrage data and flexibly expand boolean arrays
//partial caught up feature
//calendar

$(function() {
	
	Parse.$ = jQuery; //reassign jQuery, god knows why
	Parse.initialize("CI4kTSt4LME3DQopwCpnh4E4yEFwr0fEwYpAeNuF", "kh8MdcK8IcQnTMXzCmUvogxdREWP7eyRv4VGQoVG"); //initialize with login keys

//backbone.js stuff. Bools, Show are MODELS, BoolStack and ShowStack are COLLECTIONS

	var Bools = Parse.Object.extend("Bools",{
		defaults:{
			'show_id'	: 	null,
			'seasons'	: 	null,
		    'array'		: 	null,
		    user		:   Parse.User.current()
		    // ACL:    new Parse.ACL(Parse.User.current())
		}, 
		initialize: function() {
			//on initialization, create an array [[],[],[]] of length $seasons
			console.log(Parse.User.current());
			this.set({
				array: createArray(this.get('seasons'),0)
			});
		}
	});
	
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
		initialize: function() {
		},
		ask: function(s, e) {
		},
		toggle: function(s, e) {
		}
	});

	var BoolStack = Parse.Collection.extend({
		model: Bools,
		initialize : function() {
			console.log('BoolStack initialized');
		}
	});

	var ShowStack = Parse.Collection.extend({
		model: Show,
		comparator: function(model) {
			return model.get('name');
		},
		initialize : function() {
			console.log('ShowStack initialized');
		},
	});

	var xhr; //one xhr request at a time, friend
	var currentTab = '';
	var defaultTab = 'queue'; //which tab to open on
	var queueLimit = 3;
	var _MS_PER_DAY = 1000 * 60 * 60 * 24; //stuff for date handling, from SE
	var today = Date.today();
	var longTime = 5000;
	var shortTime = 3000;
	var myBools = new BoolStack;
	var myShows = new ShowStack;

	//onboarding, empty, queue, add, manage

	//things to do only once, on startup
	$(document).ready(function() {
		console.log('$(document).ready called');
		tryLogin();
	});

//login stuff

	//returns boolean
	function isLoggedIn() {
		if (Parse.User.current()) {
			return true;
		} else {
			return false;
		}
	}

	//checks if logged in.
	//	if so, 	launch
	//	if not, onboard
	function tryLogin() {
		console.log(isLoggedIn());

		if(isLoggedIn()) {
			pushAlert('Hi, ' + capitalize(Parse.User.current().attributes.username) + '!');
			displayTabs(true);	bindTabs(true);
			displayWings(true);	bindWings(true);
			launch();
			// getMyBools();
		} else {
			displayTabs(false);		bindTabs(false);
			displayWings(false);	bindWings(false);
			tab_goto('onboarding');
		}
	}

	function tryLogout() {
		console.log('tryLogout() called');
		if(isLoggedIn()) {
			pushAlert('Bye, ' + capitalize(Parse.User.current().get('username')) + '!');
			Parse.User.logOut();

			displayTabs(false);		bindTabs(false);
			displayWings(false); 	bindWings(false);

			$('#totalQueued').empty();

			tab_goto('onboarding');			
		} else {
			pushAlert('Already logged out.');
		}
	}

//wings stuff

	function displayWings(bool) {
		if(bool) {
	        $('#logio').show();
	        $('#whoami').show();
		    $('#whoami span').html(capitalize(Parse.User.current().get('username')));
		} else {
			$('#logio').hide();
		    $('#whoami').hide();
		    $('#whoami span').empty();
		}
	}
	function bindWings(bool) {
		if(bool) {
			$('#logio').click(function() {
	        	var oldUsername = Parse.User.current().attributes.username;
	        	tryLogout();
	        });
	        $('#whoami').click(function() {
	        	tab_goto('manage');
	        });
		} else {
			$('#logio').unbind();
			$('#whoami').unbind();
		}
	}

//tab stuff

	function displayTabs(bool) {
		if(bool) {
			$('.tabsblock a').show();
		} else {
			$('.tabsblock a').hide();
		}
	}
	function bindTabs(bool) {
		if(bool) {
			$('.tabsblock a').click(function() {
				tab_goto($(this).attr('id'));
			});			
		} else {
			$('.tabsblock a').unbind();
		}
	}

	//navigates to a tab, and changes the .navtabs appearance to match.
	function tab_goto(desiredTab) {
		console.log('tab_goto() called');

		if (desiredTab == currentTab) {
			return;
		} else {
			currentTab = desiredTab;
			$('main section').hide();
			$('section#'+desiredTab).show();
			tab_recolor(desiredTab);
			tab_init(desiredTab);
		}
	}

	function tab_recolor(desiredTab) {
		$('.navtabs a').removeClass('btn-large darken-2');
		$('.navtabs a').addClass('btn lighten-1');
		$('.navtabs a#'+desiredTab).toggleClass('btn btn-large darken-2 lighten-1');
	}

	function tab_init(desiredTab) {
		if (desiredTab == 'add') {
			add_stage_a();
		} else if (desiredTab == 'onboarding') {
			onboarding_init();
		} else if (desiredTab == 'empty') {
			empty_init();
		} else if (desiredTab == 'queue') {
			queue_render();
		} else if (desiredTab == 'manage') {
			manage_init();
		}
	}


// onboarding section behaviors

	function onboarding_switch(stage) {
		console.log('onboarding_switch() called');

		$('section#onboarding .card-content').hide();
		$('section#onboarding .card-action a').hide();
		onboarding_try_again();
		if(stage=='a') {
			$('section#onboarding .card-content#about').show();
			$('section#onboarding .card-action a#signup').show();
			$('section#onboarding .card-action a#login').show();			
		} else if (stage == 'b') {
			$('section#onboarding .card-content#entry').show();
			$('section#onboarding .card-action a#cancel').show();
			$('section#onboarding .card-action a#cancel').click(function() {
				onboarding_switch('a');
			});
		}
	}

	function onboarding_init() {
		console.log('onboarding_init() called');

		tab_goto('onboarding');
		onboarding_switch('a');
		$('section#onboarding .card-action a').unbind();
		$('section#onboarding .card-action a#login').click(function() {
			onboarding_login();
		});
		$('section#onboarding .card-action a#signup').click(function() {
			onboarding_signup();
		});
	}

	function onboarding_login() {
		console.log('onboarding_login() called');

		$('section#onboarding #entry h5').text('Log In');

		onboarding_switch('b');

		$('section#onboarding .card-action a#go').show();
		$('input#username').focus();

		$("input#password").keyup(function(event) {
			if(event.keyCode == 13) { 
				onboarding_collect();
			}
		});

		$("section#onboarding .card-action a#go").click(function(event) {
			onboarding_collect();
		});
	}

	function onboarding_signup() {
		console.log('onboarding_signup() called');

		$('section#onboarding #entry h5').text('Sign Up');
		onboarding_switch('b');
		$('section#onboarding .card-action a#go').show();
		$('input#username').focus();

		$("input#password").keyup(function(event) {
			if(event.keyCode == 13) { 
				onboarding_collect();
			}
		});

		$("section#onboarding .card-action a#go").click(function(event) {
			onboarding_collect();
		});
	}

	function onboarding_collect() {
		console.log('onboarding_collect() called');

		var username = $('section#onboarding input#username').val();
		var password = $('section#onboarding input#password').val();
		var mode = $('section#onboarding #entry h5').text();
		onboarding_parse(username, password, mode);
	}

	function onboarding_parse(username, password, mode) {
		console.log('onboarding_parse() called');

		if (mode == 'Sign Up') {
			// console.log('signing up: username:' + username + ' password:'+password);
			Parse.User.signUp(username, password, { ACL: new Parse.ACL(), shows : 0 }, {
		        success: function(user) {
		        	tryLogin();
		        },

		        error: function(user, error) {
		        	console.log(_.escape(error.message));
		        	onboarding_try_again();
		        }
		      });
		} else if (mode == 'Log In') {
			// console.log('logging in: username:' + username + ' password:'+password);
			Parse.User.logIn(username, password, {
		        success: function(user) {
		        	// console.log('success login');
		        	tryLogin();
		        	// ^ this toasts
		        	tab_goto('queue');
		        },

		        error: function(user, error) {
		        	pushAlert("Invalid username or password. Please try again.");
		        	onboarding_try_again();
		        }
		     });
		}
	}

	function onboarding_try_again() {
		console.log('onboarding_try_again() called');

		$('section#onboarding input#username').val('');
		$('section#onboarding input#password').val('');
		$('section#onboarding input#username').focus();
	}

	function launch() {
		tab_goto(defaultTab);
		getMyBools();
	}


// BOOLS model behavior

	function tryBools(showModel, seen) {
		console.log('tryBools() called');

		var query = new Parse.Query(Parse.Object.extend("Bools"));
		
		query.equalTo("show_id", parseInt(showModel.get('show_id')));
		query.equalTo("user", Parse.User.current());
		
		query.find({
		  success: function(results) {
		  	// console.log('Got results from the parse query. Here:');
		  	// console.log(results);

		  	//if the show doesn't exist, make our own

		  	if (results.length == 0) {
			    // console.log("Didn't find any boolean results. Creating own.");
				var temp = new Bools({
					'show_id' : parseInt(showModel.get('show_id')),
					'seasons' : parseInt(showModel.get('num_seasons'))
				});


				// console.log('empty is ' + status);
				// console.log('loooking for episodes')
				// console.log(showModel.get('episodes'));

				var eps = showModel.get('episodes');
				var array = createArray(temp.get('seasons'),0);
				for (var i = 0; i < eps.length; i++) {
					for (var j = 0; j < eps[i].length; j++) {
						// console.log('setting: ' + i + j + seen)
						array[i][j] = seen;
					}
				}

				temp.set({
					'array' : array
				});

				temp.save({
					success: function() {
						var name = showModel.get('name');
						add_stage_g(name);
						pushAlert('Successfully added ' + name);
						getMyBools();
						// console.log(myBools);
			    		// manage_render();
			    		// queue_render();
	    		  		// update_queued_total();
					},
					error: function(error) {
						// console.log('Didn\'t Save Bools');
						// console.log(error);
						// console.log('error.code ' + error.code + error.message);

					}
				});

		  	} else { //if it does, use it

			    // console.log("Successfully retrieved " + results.length + " bools. Here's the first.");
			    var result = _.first(results);
			    getMyBools();
	    		manage_render();
	    		queue_render();
		  		update_queued_total();
			    // console.log(result);
		  	}
		  },
		  error: function(error) {
		    // console.log("Error: " + error.code + " " + error.message);
		  }
		});
	}

// show model behavior


	function addShow(showObj, seen) {
		console.log('addShow() called');

		//determine if the show exists or not
		//and create it if it does
		var query = new Parse.Query(Parse.Object.extend("Show"));
		query.equalTo("show_id", parseInt(showObj.showid));
		query.find({
		  success: function(results) {
		  	// console.log('Got results from the parse query. Here they are.');
		  	// console.log(results);
		  	//if the show doesn't exist
		  	if (results.length == 0) {
			    // console.log("Didn't find any. Creating own.");
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
					success: function() {
			    		pushAlert("Getting '"+showModel.get('name')+"'...");
						fetchEps(showModel, seen);
					},
					error: function(error) {
						// console.log('Didn\'t Save Show');
						// console.log(error);
						// console.log('error.code ' + error.code + error.message);
					}
				});

		  	} else { //if it does already exist

			    // console.log("Successfully retrieved " + results.length + " scores. Here's the first.");
			    
			    var showModel = _.first(results);
	    		fetchEps(showModel, seen);
			    
			    // console.log(showModel);
	    		
	    		// add_switch('a');
	    		pushAlert("Getting '"+showModel.get('name')+"'...")
		  	}
		  },
		  error: function(error) {
		    // console.log("Error: " + error.code + " " + error.message);
		  }
		});
	}

// episodes handling functions

	function fetchEps(showModel, seen) {
		console.log('fetchEps() called');

		// console.log('getting episodes by model');
		$.ajax({
			url: 'http://www.jbuckland.com/ketchup.php?func=show&query=' + showModel.get('show_id'), 
			dataType: "json",
			type: 'GET',
			success: function(data) {
				// console.log(data);
				processedData = processEpisodes(data);

				showModel.set('episodes', processedData);
				showModel.save();

				tryBools(showModel, seen);

			},
			error: function(error) {
				// console.log(error);
			}
		});
	}

	function processEpisodes(data) {
		console.log('processEpisodes() called');

		// console.log(data);
		// console.log('processing episodes');
		var result = [];
		if ( data.totalseasons == 1 ) { //weird case
			result[0] = [];
			for (var i = 0; i < data.Episodelist.Season.episode.length; i++) {
				result[0][i] = {};
				result[0][i]['airdate'] = data.Episodelist.Season.episode[i].airdate;
				result[0][i]['epnum'] = data.Episodelist.Season.episode[i].epnum;
				result[0][i]['seasonnum'] = data.Episodelist.Season.episode[i].seasonnum;
				result[0][i]['title'] = data.Episodelist.Season.episode[i].title;
			}
		} else { //normal case
			for (var i = 0; i < data.Episodelist.Season.length; i++) {
				result[i] = [];
				for (var j = 0; j < data.Episodelist.Season[i].episode.length; j++) {
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

//bools fetcher

	function getMyBools() {
		console.log('getMyBools() called');

		var boolsObject = Parse.Object.extend("Bools");
		var boolsQuery = new Parse.Query(boolsObject);
		boolsQuery.equalTo("user", Parse.User.current());
		boolsQuery.find({
			success: function(results) {
				myBools.reset();
				myShows.reset();
				_.each(results, function(result, index) {
					myBools.add(result);
					// console.log(index);
					getSingleShow(result.get('show_id'), index);
				});
			}
		});
	}


	function getSingleShow(id, index) {
		// console.log('getSingleShow() called');

		var showsObject = Parse.Object.extend("Show");
		var showsQuery = new Parse.Query(showsObject);
		// console.log(id);
		showsQuery.equalTo("show_id", parseInt(id));
		showsQuery.find({
			success: function(results) {
				var result = _.first(results);
				myShows.add(result);
				// console.log('index' + index);
				queue_render();
				manage_render();
		  		update_queued_total();
			}
		});
	}


// add section behavior

	function add_cancel() {
		console.log('add_cancel() called');

		add_switch('a');
		xhr.abort();
		pushAlert("Query aborted.");
	}

	function add_switch(stage) {
		console.log('add_switch() called');

		$('section#add .card-content').hide();
		$('section#add .card-action a').hide();
		$('section#add .card-content#add-content-'+stage).show();
		if(stage=='a') {
			$('section#add .card-action a#add').show();
			$('section#add input#input').val("");
			$('section#add input#input').focus();
		} else {
			$('section#add .card-action a#cancel').show();
			$('section#add .card-action a#cancel').click(function() {
				add_cancel();
			});
		}
	}

	//what's the name of the show?
	function add_stage_a() {
		console.log('add_stage_a() called');

		add_switch('a');
		$("section#add input#input").keyup(function(event) {
			if(event.keyCode == 13) { 
				var title = $('section#add input#input').val();
				add_stage_b(title);
			}
		});

		$("section#add .card-action a#add").click(function(event) {
			var title = $('section#add input#input').val();
			add_stage_b(title);
		});
	}

	//searching for shows titled
	function add_stage_b(string) {
		console.log('add_stage_b() called');

		add_switch('b');
		// console.log(string);
		$('section#add .card-content#add-content-b b').text(string);
		var shortname = string.toLowerCase().replace(/\s/g, '-'); //NICE ONE PLANK
		// $('section#add .card-content#add-content-b span').text(shortname);
		// console.log(shortname);
		//if the string is empty, it's not a mistake 
		if (!shortname) {
			pushAlert("Type the name of a show you\'d like to follow\ in the input box.");
			$('section#add input#input').focus();
			add_switch('a');
			return;
		}
		// console.log(shortname);
		xhr = $.ajax({
			url: 'http://www.jbuckland.com/ketchup.php?func=search&query=' + shortname, 
			// url: 'http://services.tvrage.com/feeds/search.php?show=' + shortname, 
			dataType: "json",
			type: 'GET',
			success: function(data) {
				// console.log(data);
				if (data == false) {
					//cancel
					add_switch('a');
					pushAlert('Something\'s wrong with the database.');
				} else if (data[0]=="0") {
					// no search results
					add_switch('a');
					pushAlert('No Search Results Found');
				} else {
					//next step
					add_switch('c');
					add_stage_c(string, data);
					// console.log(data);
					if(data.show.length) {
						pushAlert(data.show.length + ' Results Found');
					} else {
						pushAlert('1 Result Found');						
					}
				}
			}
		});
	}

	//which of these do you mean?
	function add_stage_c(string, data) {
		console.log('add_stage_c() called');


		// console.log('is array? ' + _.isArray(data['show']));

		//if there's only one search result, wrap it in an array
		if(!_.isArray(data['show'])) {
			var tempdata = data['show'];
			data['show'] = new Array();
			data['show'].push(tempdata);
		}

	  	var template = _.template( 
	  		$('#search-results-template').html()
  		);

	  	var templateData = { results: data.show };

		$("#add-content-c span").html( template(templateData) );

		$("#add-content-c .collection a").click(function() {
			var id = $(this).attr('id');
			var show = _.findWhere(data.show, {showid: id});
			add_stage_d(show);
		});
	}

	//where are you at?
	function add_stage_d(show) {
		console.log('add_stage_d() called');

		add_switch('d');
		$('#add-content-d h5 b').text(show['name']);
		// console.log(show);

		$('div#add-content-d a#full').click(function() {
			addShow(show, true);
			add_stage_f(show);
		});
		$('div#add-content-d a#part').click(function() {
			add_stage_e(show);
		});
		$('div#add-content-d a#empty').click(function() {
			addShow(show, false);
			add_stage_f(show);
		});
	}

	//how far exactly?
	function add_stage_e(show) {
		console.log('add_stage_e() called');
	}

	function add_stage_f(show) {
		console.log('add_stage_f() called');

		add_switch('f');
		$('#add-content-f h5 b').text(show['name']);
	}

	function add_stage_g(name) {
		console.log('add_stage_g() called');

		queue_render();
		add_switch('g');
		$('#add-content-g h5 b').text(name);
		setTimeout(function() {
			add_switch('a');
		},3000)
	}

// empty section behavior

	function empty_init() {
		console.log('empty_init() called');

		$('section#empty .card-action a#add').click(function() {
			tab_goto('add');
		});
	}

// queue stuff

	function queue_render() {
		// console.log('queue_render() called');

		if (myBools.length != myShows.length) { return; }
  		update_queued_total();
		// if (myBools.length == 0 || myShows.length == 0) {tab_goto('empty'); }
		
	  	var showTemplate 	= _.template( $('#queue-item-template').html() );
	  	var episodeTemplate = _.template( $('#episode-template').html() );
	  	var moreTemplate 	= _.template( $('#more-template').html() );

		$("section#queue #queuecollection").empty(); //empty #queuecollection with each render
	  	
	  	//for every show in global myShows
	  	_.each(myShows.models, function(thisShow, show_index){
	  		
		  	var show_id = thisShow.get('show_id');
	  		
	  		if(calculate_queued_per_show(show_id)==0) { return; }	//if all seen, skip entirely

	  		var showTemplateData = {
		        'showname'	: thisShow.get('name'),
		        'unseen'	: calculate_queued_per_show(show_id),
		        'shade'		: 'green',
		        'showid'	: thisShow.get('show_id')
		  	};

			$("section#queue #queuecollection").append( showTemplate(showTemplateData) );

			var el = $("section#queue #queuecollection li#"+show_id);

			//these are all show-specific
	  		var show = thisShow.get('episodes');
	  		var queuedPerShow = 0;
	  		var isOverflow = false;

		  	//this performs a search so that we don't have to later
		  	//gets the array from global myBools which we're on, according to show_id
			var array = _.first(_.filter(myBools.models, function(model){
				return (model.get('show_id') == show_id);
			})).get('array');

  			//for every season in the show
			_.each(show, function(season, season_index){
	  			//for every episode in the season
	  			_.each(season, function(ep, ep_index){
	  				var seen = array[season_index][ep_index]; //boolean for seen || queued

	  				if(seen){ return; } //if it's queued

  					queuedPerShow++;
  					if (queuedPerShow > queueLimit){
  						isOverflow = true;
  					}
  						  					
  					var episodeTemplateData = {
  						'show_id' 	: show_id,
				        's' 		: season_index+1,
				        'e' 		: pad(ep_index+1, 2),
				        'j' 		: season_index,
				        'k' 		: ep_index,
				        'title' 	: ep.title,
				        'icon' 		: seen ? 'check_box_outline_blank' : 'check_box',
				        'color' 	: 'green',
				        'extra' 	: isOverflow,
				        'hiding'	: isOverflow ? 'none' : 'inline-block'
  					};

  					//print it
					$("section#queue #queuecollection li#"+show_id+" p").append( 
						episodeTemplate(episodeTemplateData) 
					);
	  			});
			});

			// if there's overflow, write the MORE button
	  		if (isOverflow) {
	  			moreTemplateData = {
	  				'showid'	:	show_id,
	  				'more'		:	String(queuedPerShow - queueLimit) 
	  			};
				el.children('p').append( moreTemplate(moreTemplateData) );
	  		}

	  	});

	  	//update seen + toggle checked on a.episode click
	  	$("section#queue a.episode").click(function() {
	  		var showid  = $(this).attr('data-show');
	  		var season  = $(this).attr('data-season');
	  		var episode = $(this).attr('data-episode');
	  		
	  		toggleSeen(showid, season, episode);
	  		
	  		$(this).toggleClass('lighten-3');

	  		if($(this).children('i').html() == 'check_box') {
		  		$(this).children('i').html('check_box_outline_blank');
		  		update_queued_total();
	  		} else {
		  		$(this).children('i').html('check_box');
		  		update_queued_total();
	  		}
	  	});

	  	//toggle .extra on a.more click
		$("section#queue a.more").click(function() {
			$('#queuecollection li#'+$(this).attr('id')+" p a.extra").toggle();

			$(this).children('i').toggleClass('left');
			$(this).children('span.text').toggle();

			//attributes can't be booleans
			if ($(this).attr('data-toggled') == 'false') {
				$(this).children('i').html('expand_less');
				$(this).attr('data-toggled', 'true');
			} else {
				$(this).children('i').html('expand_more');	
				$(this).attr('data-toggled', 'false');
			}

		});
	}

	//updates the total number of queued episodes as it appears anywhere needed
	//i fear this is called too often
	function update_queued_total() {
		console.log('update_queued_total() called');
		//currently only needed in the tab span#totalqueued
		var qd = calculate_queued_total();
		if (qd == 0){
			qd = 'Nothing';
		}
		$("span#totalQueued").html(qd);

	}

	//returns the number of queued episodes in global myBools
	function calculate_queued_total() {
		// console.log('calculate_queued_total() called');

		var num = 0;
		_.each(myBools.models, function(model) {
			_.each(model.get('array'), function(s) {
				_.each(s, function(e) {
					if(!e) {num++};
				});
			});
		});
		return num;
	};

	//returns the number of queued episodes in an individual show from global myBools
	function calculate_queued_per_show(showid) {
		// console.log('calculate_queued_per_show() called');

		var num = 0;

		var array = _.first(_.filter(myBools.models, function(i){
			return (i.get('show_id') == showid);
		})).get('array');

		_.each(array, function(s) {
			_.each(s, function(e) {
				if(!e) {num++};
			});
		});

		return num;
	}

// manage stuff

	function manage_init() {
		console.log('manage_init() called');

		// console.log('initializing manage');
		// console.log(myShows);
		manage_render();	
	}

	function manage_render() {
		console.log('manage_render() called');


		if (myBools.length != myShows.length) { return; }
		if (myBools.length == 0 || myShows.length == 0) { return; }

		if (myBools.length > 15) {
			pushAlert('For best performance, remove shows that are off the air.', longTime);
		}
		// console.log('tests passed, rendering manage afresh');

	  	var manage_template = _.template( $('#manage-item-template').html() );
	  	var manage_details_template = _.template( $('#manage-details-template').html() );
		$("section#manage #managecollection").empty();
		for (var i = 0; i < myShows.length; i++) {
			var thisShow = myShows.at(i);
		  	var show_id = thisShow.get('show_id');
	  		var thisBool = _.find(myBools.models, function(item) { return item.get('show_id') === show_id; });
	  		var manage_data = {
		        showname : thisShow.get('name'),
		        unseen : 0,
		        shade : 'green',
		        showid : thisShow.get('show_id'),
		        num_seasons : thisShow.get('episodes').length
		  	};
		  	// console.log('appending showtemplate');
			$("section#manage #managecollection").append( 
				manage_template(manage_data) 
			);
			// console.log(myShows.at(i).get('episodes'));
			var manage_details_data = {
				name : thisShow.get('name'),
				classification	: thisShow.get('classification'),
				country	: thisShow.get('country'),
				started	: thisShow.get('started'),
				ended	: thisShow.get('ended'),
				status	: thisShow.get('status'),
		        episodes : thisShow.get('episodes'),
		        num_seasons : thisShow.get('episodes').length,
		        showid : thisShow.get('show_id')
		  	};
		  	// console.log('appending showtemplate');
			$("section#manage #managecollection").append( 
				manage_details_template(manage_details_data) 
			);
			//inject episodes
			for(var j = 0; j < thisShow.get('episodes').length; j++) {
				var seenThisSeason = 0;
				var thisSeason = thisShow.get('episodes')[j];
				for (var k = 0; k < thisSeason.length; k++) {
	  				var seen = thisBool.get('array')[j][k];
	  				if(seen) {seenThisSeason++;}
					var thisEp = thisSeason[k];
					// console.log(i+' '+j+' '+k);
					// console.log(seen);
					var color = seen?'green lighten-2':'green';
					var icon = seen?'check_box':'check_box_outline_blank';
					// console.log(icon);
					var episodeTemplate = _.template( $('#episode-template').html() );
  					var episodeTemplateData = {
  						'showid' : show_id,
  						'show_id' : show_id,
				        's' : j+1,
				        'e' : pad(k+1, 2),
				        'j' : j,
				        'k' : k,
				        'title' : thisEp.title,
				        'icon' : icon,
				        'color' : color,
				        'extra' : false,
				        'hiding': false
  					};
					$('section#manage #managecollection #'+show_id+'x'+j).append( 
						episodeTemplate(episodeTemplateData) 
					);
				}
			}
		}

		//unbind behaviors
		$("section#manage a.episode").unbind();

		//toggle on click
	  	$("section#manage a.episode").click(function() {
	  		var showid = $(this).attr('data-show');
	  		var season = $(this).attr('data-season');
	  		var episode = $(this).attr('data-episode');
	  		toggleSeen(showid, season, episode);
	  		$(this).toggleClass('lighten-2');
	  		if($(this).children('i').html()=='check_box') {
		  		$(this).children('i').html('check_box_outline_blank');
	  		} else {
		  		$(this).children('i').html('check_box');
	  		}
	  		queue_render();
			update_lenses(myBools);
	  	});
		
		//initialize all tabs
		$('ul.tabs').tabs();
		$('.manage-item-details').hide();
		
		//expand click behaviors
		var expanded = false;
		$('section#manage a#expand').click(function() {
			var showid = $(this).attr('data-id') 
			// console.log(showid);
			$(this).parent().parent().next().toggle();
			if(expanded) { 
				$(this).children('i').html('expand_more');
				expanded = false;
			} else {
				$(this).children('i').html('expand_less');
				expanded = true;				
			}
		});

		$('section#manage a#delete').click(function() {
			var showid = $(this).attr('data-id');
			var name = $(this).attr('data-name');
			manage_delete(showid,name);
		});

		$('section#manage a#reset').click(function() {
			var showid = $(this).attr('data-id');
			var name = $(this).attr('data-name');
			manage_reset(showid,name);
		});

		$('section#manage a#set').click(function() {
			var showid = $(this).attr('data-id');
			var name = $(this).attr('data-name');
			manage_set(showid,name);
		});

		update_lenses(myBools);
	}

	function manage_delete(showid, name) {
		console.log('manage_delete() called');

		result = _.first(myBools.filter(function(model) {
  			return model.get('show_id') == showid;
  		}));

		console.log(result);
		pushAlert('Deleted ' + name);
  		result.destroy();
		$('#managecollection li#'+showid).remove();
  		// console.log($('#managecollection li#'+showid));
  		update_queued_total();
	}

	function manage_reset(showid, name) {
		console.log('manage_reset() called');

		// console.log(myBools);
		for(var i = 0; i < myBools.length; i++) {
			if(myBools.at(i).get('show_id') == showid) {
				// console.log(myBools.at(i).get('array'));
				var tempArray = myBools.at(i).get('array');
				for(var j = 0; j < tempArray.length; j++) {
					for(var k = 0; k < tempArray[j].length; k++) {
						tempArray[j][k] = false;
					}
				}
				myBools.at(i).set('array', tempArray);
				myBools.at(i).save();
				getMyBools();
				queue_render();
				update_queued_total();
				pushAlert('Queued all episodes of ' + name + '.');
			}
		}
	}

	function manage_set(showid, name) {
		console.log('manage_set() called');

		for(var i = 0; i < myBools.length; i++) {
			if(myBools.at(i).get('show_id') == showid) {

				var tempArray = myBools.at(i).get('array');
				for(var j = 0; j < tempArray.length; j++) {
					for(var k = 0; k < tempArray[j].length; k++) {
						tempArray[j][k] = true;
					}
				}

				myBools.at(i).set('array', tempArray);
				myBools.at(i).save();
				
				getMyBools();
				
				queue_render();
				
				update_queued_total();
				
				pushAlert('Marked all episodes of ' + name + ' as seen.');
			}
		}
	}

	// updates ALL the lenses in section#manage
	// TODO rewrite faster: update just a particular show's lenses 
	function update_lenses(myBools) {
		console.log('update_lenses() called');

		myBools.each(function(model, index) {

			var thisBool = model.get('array');
			var show_id = model.get('show_id');

			for(var j = 0; j < thisBool.length; j++) {

				thisSeason = thisBool[j];

				//of the form #12345x0dot, where 12345 is the show_id and 0 is the season index
				var el = $( '#' + show_id + 'x' + j + 'dot'); 

				el.attr('class', 'material-icons'); //removes all classes except one

				if (_.every(thisSeason, _.identity)) { 
					//completely seen season
					el.html('radio_button_unchecked');
					el.addClass('grey-text');
				} else if (_.some(thisSeason, _.identity)){ 
					//partially seen season
					el.html('timelapse');
					el.addClass('light-green-text');
				} else { 
					//completely unseen season
					el.html('lens');
					el.addClass('green-text');
				}
			}

		});
	}

//general utility functions

	//toggles seen/unseen in the global myBools model
	function toggleSeen(showid, season, episode) {
		console.log('toggleSeen() called');

  		result = _.first(myBools.filter(function(model) {
  			return model.get('show_id') == showid;
  		}));
  		arrayCopy = result.get('array');
  		currVal = arrayCopy[season][episode];
  		newVal = !currVal;
  		arrayCopy[season][episode] = newVal;
  		result.set('array', arrayCopy);
  		result.save();
	}

	//pushes an alert to the box in the corner
	function pushAlert(str, num) {
		console.log('pushAlert() called: ' + str);

		if(!_.isUndefined(num)) {
			Materialize.toast(str, num);
		} else {
			Materialize.toast(str, shortTime);			
		}
	}

	//returns an array of multiple dimensions; accepts multiple variables
	function createArray(length) {
		// console.log('createArray() called');

	    var arr = new Array(length || 0),
	        i = length;

	    if (arguments.length > 1) {
	        var args = Array.prototype.slice.call(arguments, 1);
	        while(i--) arr[length-1 - i] = createArray.apply(this, args);
	    }

	    return arr;
	}

	//pads a number $n to width $w with zero character $z
	function pad(n, w, z) {
		z = z || '0';
		n = n + '';
		return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
	}

	//returns a boolean; true if the $date is before global $today
	function hasItAired(date) {
		console.log('hasItAired() called');

		var parsed = Date.parse(date);
		// console.log(parsed);
	}

	//returns a capitalized $string
	function capitalize(string) {
	    return string.charAt(0).toUpperCase() + string.slice(1);
	}

});