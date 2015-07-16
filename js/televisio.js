//TODO

//TODO: fix bug where you set  all seen / unseen but the view doesnt update

//DOESNT WORK 4 BIG SETS
//  fix calculate_queued and make it smarter / database-informed, possibly - as it is, televis.io breaks at ~10 shows

//TODO: FETCH EPS OCCURS WHEN ADDING SHOW ALREADY ADDED
//TODO: FLEXIBLE COMPARATORS
//TODO: partial queue–render(showid), etc 

//TODO: ADD - sometimes adds duplicate shows asynchronously
//TODO: specific episode ADD
//TODO: FETCH NEW EPS + EXPAND MYBOOLS
//TODO: CALENDAR

$(function() {
	
	Parse.$ = jQuery; //reassign jQuery, god knows why
	Parse.initialize("CI4kTSt4LME3DQopwCpnh4E4yEFwr0fEwYpAeNuF", "kh8MdcK8IcQnTMXzCmUvogxdREWP7eyRv4VGQoVG"); //initialize with login keys

//backbone.js stuff

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
			// return model.get('name');
			return -calculate_queued(model.get('show_id'));
		},
		initialize : function() {
			console.log('ShowStack initialized');
		},
	});

//constants

	var xhr; 					// one xhr request at a time, frien
	var currentTab = ''; 		// which tab we're on
	var defaultTab = 'add';  // which tab to open on
	var queueLimit = 3; 		// num of eps per show in q item
	var _MS_PER_DAY = 1000 * 60 * 60 * 24; //stuff for date handling, from SE
	// var today = Date.today();
	var longTime 	= 5000; //for toasts
	var shortTime 	= 3000;	//for toasts
	var myBools = new BoolStack;
	var myShows = new ShowStack;
	var tabStates = {
		'queue'  : 'thinking',
		'manage' : 'thinking'
	}
	var tabColors = {
		'default' : 'white',
		'add' : '#4dd0e1',
		'queue' : '#00bcd4',
		'manage' : '#0097a7',
	}

//things to do only once, on startup

	$(document).ready(function() {
		console.log('$(document).ready called');
		tryLogin();
		fixState('manage', 'thinking');
		fixState('queue', 'thinking');
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
	function tryLogin() {
		// console.log(isLoggedIn());

		if(isLoggedIn()) {
			toast('Hi, ' + Parse.User.current().attributes.username + '!');
			displayTabs(true);	bindTabs(true);
			displayWings(true);	bindWings(true);
			bindEmpties(true);
			tab_goto(defaultTab);
			fetchBools();
		} else {
			displayTabs(false);		bindTabs(false);
			displayWings(false);	bindWings(false);
			tab_goto('onboarding');
		}
	}

	//tries to log out.
	function tryLogout() {
		console.log('tryLogout() called');
		if(isLoggedIn()) {
			toast('Bye, ' + Parse.User.current().get('username') + '!');
			Parse.User.logOut();

			displayTabs(false);		bindTabs(false);
			displayWings(false); 	bindWings(false);
			bg_recolor('default');
			// $('ul#queue_full').empty();
			// $('#manage_full').empty();

			$('#totalQueued').empty();

			tab_goto('onboarding');			
		} else {
			toast('Already logged out.');
		}
	}

//wings stuff

	//does / doesn't display wings
	function displayWings(bool) {
		if(bool) {
	        $('#logio').show();
	        $('#whoami').show();
		    $('#whoami span').html(Parse.User.current().get('username'));
		} else {
			$('#logio').hide();
		    $('#whoami').hide();
		    $('#whoami span').empty();
		}
	}

	//does / doesn't bind wings behavior
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

	//does / doesn't display tabs
	function displayTabs(bool) {
		if(bool) {
			$('.tabsblock a').show();
		} else {
			$('.tabsblock a').hide();
		}
	}

	//does / doesn't bind tab behavior
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
		console.log('tab_goto() ' + desiredTab);

		if (desiredTab == currentTab) {
			return;
		} else {
			$('main section').hide();
			$('section#'+desiredTab).show();
			bg_recolor(desiredTab);
			tab_init(desiredTab);
			currentTab = desiredTab;
			checkStacks(desiredTab);
		}
	}

	//recolors background to match selected tab
	function bg_recolor(desiredTab){
		$('main').css("background-color", tabColors[desiredTab]);
	}

	//only necessary for tabs with more than one stage - not queue or manage
	function tab_init(desiredTab) {
		if (desiredTab == 'add') {
			add_ask();
			//needs to be reset
		} else if (desiredTab == 'onboarding') {
			onboarding_init();
			//needs to be reset
		}
	}

//empties stuff

	function bindEmpties(bool) {
		if(bool) {
			$('#manage_empty a#follow').click(function() {
				tab_goto('add');
			});
			$('#queue_empty a#follow').click(function() {
				tab_goto('add');
			});
		} else {

		}
	}

// onboarding section behaviors

	//switch onboarding views in dom
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

	//initialize onboarding
	function onboarding_init() {
		console.log('onboarding_init() called');

		onboarding_switch('a');
		$('section#onboarding .card-action a').unbind();
		$('section#onboarding .card-action a#login').click(function() {
			onboarding_login();
		});
		$('section#onboarding .card-action a#signup').click(function() {
			onboarding_signup();
		});
	}

	//if logging in
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

	//if signing up
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

	//on GO, collect info and mode and process
	function onboarding_collect() {
		console.log('onboarding_collect() called');

		var username 	= $('section#onboarding input#username').val();
		var password 	= $('section#onboarding input#password').val();
		var mode 		= $('section#onboarding #entry h5').text();

		if (mode == 'Sign Up') {
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
			Parse.User.logIn(username, password, {
		        success: function(user) {
		        	tryLogin();
		        	tab_goto('queue');
		        },
		        error: function(user, error) {
		        	toast("Invalid username or password. Please try again.");
		        	onboarding_try_again();
		        }
			});
		}
	}

	//if failed, try again
	function onboarding_try_again() {
		console.log('onboarding_try_again() called');

		$('section#onboarding input#username').val('');
		$('section#onboarding input#password').val('');
		$('section#onboarding input#username').focus();
	}

// show model behavior

	//given a $showObj OBJ and its status $seen,
	//	look for it on Parse
	//	if it exists, 
	//		fetch its eps
	//	if it doesn't,
	//		create it and fetch its eps 
	function tryShow(showObj, seen) {
		console.log('tryShow() called');

		var query = new Parse.Query(Parse.Object.extend("Show"));
		query.equalTo("show_id", parseInt(showObj.showid));
		query.find({
		  	success: function(results) {
			  	if (results.length != 0) { //if the show exists
			  		var showModel = _.first(results);
		    		fetchEps(showModel, seen); //async
		    		toast("Getting '"+showModel.get('name')+"'...")
			  	} else {//if the show doesn't
			  		//careful typecasting
					var showModel = new Show({
						'show_id'			: parseInt(showObj.showid),
						'num_seasons'		: parseInt(showObj.seasons),
						'name'				: String(showObj.name),
						'classification'	: String(showObj.classification),
						'country'			: String(showObj.country),
						'ended'				: String(showObj.ended),
						'started'			: String(showObj.started),
						'status'			: String(showObj.status)
					});

					//save showModel to Parse::Show
					showModel.save({
						success: function() {
				    		toast("Getting '"+showModel.get('name')+"'...");
							fetchEps(showModel, seen); //async
						},
						error: function(error) {
							toast("Couldn't add show. Something's quite wrong.");
							toast('Error: ' + error.code + ' ' + error.message);
						}
					});
			  	}
		  	},
		  	error: function(error) {
		  		toast("Couldn't reach Parse. Something's quite wrong.");
		  		toast("Error: " + error.code + ' ' + error.message);
		  	}
		});
	}

	//only called when CREATING a show
	//  given a $showModel and a status $seen,
	//	  fetch its episodes,
	//	  process them,
	// 	  and .save() them to the $showModel.
	//	then create a BOOLS of the show.
	function fetchEps(showModel, seen) {
		console.log('fetchEps() called');

		// console.log('getting episodes by model');
		$.ajax({
			url: 'http://www.jbuckland.com/ketchup.php?func=show&query=' + showModel.get('show_id'), 
			dataType: "json",
			type: 'GET',
			success: function(data) {
				showModel.set('episodes', cleanData(data));
				showModel.save();
				tryBools(showModel, seen);
			},
			error: function(error) {
				// console.log(error);
			}
		});
	}

	//given a $showModel and a status $seen,
	//	create a user-specifc BOOLS model and .save() it. 
	function tryBools(showModel, seen) {

		var query = new Parse.Query(Parse.Object.extend("Bools"));
		//two constraints -- $show_id and $user -- UNSCALEABLE, I think
		query.equalTo("show_id", parseInt(showModel.get('show_id')));
		query.equalTo("user", Parse.User.current());
		
		query.find({
			success: function(results) {
			  	//results.length HAS TO BE ZERO
			  	// if it's not, .destroy() and recreate.

			  	if (results.length != 0) {
			  		_.each(results, function(result) {
			  			result.destroy();
			  		});
			  	}

				var newBools = new Bools({
					'show_id' : parseInt(showModel.get('show_id')),
					'seasons' : parseInt(showModel.get('num_seasons'))
				});

				var show 	= showModel.get('episodes');
				var array 	= createArray(newBools.get('seasons'),0);

				_.each(show, function(season, i) {
					_.each(season, function(episode, j) {

						if ( !hasItAired(episode.airdate) ) {
							array[i][j] = false;							
						} else {
							array[i][j] = seen;
						}

					});
				});

				newBools.set({ 'array' : array });

				newBools.save({
					success: function() {
						var name = showModel.get('name');
						toast('Successfully added ' + name); //toast
						add_great(name); //view
						fetchBools(); //model
					},
					error: function(error) {
						toast("There really shouldn't be an error here. Is Parse down?");
					}
				});

			},
			error: function(error) {
				toast("There really shouldn't be an error here. Is Parse down?");
			}
		});
	}

	// takes a $data OBJ and retuns a nicer $result OBJ
	function cleanData(data) {
		console.log('cleanData() called');

		console.log(data);
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

	//resets myBools and myShows
	//for the current user, 
	//  finds their BOOl models in the database
	//  and adds them to myBools
	//  and fetches each relevant show
	//  and adds them to myShows
	function fetchBools() {

		console.log('fetchBools() called');

		var boolsQuery  = new Parse.Query( Parse.Object.extend("Bools") );
		boolsQuery.equalTo("user", Parse.User.current());
		//async
		boolsQuery.find({
			success: function(results) {
				myBools.reset();
				myShows.reset();
				_.each(results, function(result) {
					myBools.add( result );
					fetchShow( result.get('show_id') );
				});
				checkStacks(currentTab);
			}
		});
	}

	// for a show of $id, finds the SHOW model
	//   and adds it to myShows
	function fetchShow(id) {
		console.log('fetchShow() called');

		var showsQuery  = new Parse.Query( Parse.Object.extend("Show") );
		showsQuery.equalTo("show_id", parseInt(id));
		//async
		showsQuery.find({
			success: function(results) {
				myShows.add( _.first(results) );
				checkStacks(currentTab);
			}
		});
	}

	// given global myBools and myShows STACKS,
	//   updates the queued total
	//   determines if the two STACKs are 
	//     $isEqual   --> done syncing (equal)
	//     $areShows  --> are there shows to MANAGE?
	//     $areQueued --> are there eps in the QUEUE?
	//   and triggers the tab states accordingly
	//   and renders the states accordingly
	function checkStacks(desiredTab) {
		// console.log('checking stacks');

		var isEqual = (myBools.length == myShows.length);

		update_queued();

		//if not equal, not done async loading. otherwise...
		if (!isEqual) { 
			fixState('manage', 'thinking');
			fixState('queue',  'thinking');
			return; 
		} 


		var areShows = (myShows.length != 0);
		var areQueued = (calculate_queued() > 0);
		// console.log('isEqual : ' + isEqual + ', areShows : ' + areShows + ', areQueued : ' + areQueued);

		if(areShows) {
			fixState('manage', 'thinking');
			fixState('queue',  'thinking');

			if(desiredTab == 'manage'){
				manage_render();				
			}

			if(areQueued) {
				//manage is full, queue is full
				console.log('manage is full, queue is full');
				fixState('manage', 'full');
				fixState('queue',  'full');
				if(desiredTab == 'queue'){
					queue_render();
				}
			} else {
				console.log('manage is full, queue is empty');
				fixState('manage', 'full');
				fixState('queue',  'empty');
			}
		} else {
			//manage is empty, queue is empty
			console.log('manage is empty, queue is empty');
			fixState('manage', 'empty');
			fixState('queue',  'empty');
		}
	}

	//given a TAB and its STATE
	//  hide and show all tab states accordingly
	function fixState(tab, state) {
		//if already in that state, save the jQuery expense
		if(tabStates[tab]==state){return;}
	
		console.log('tab ' + tab + ' state ' + state);
		//hide all other tab states
		$('#'+tab+'_full').hide();
		$('#'+tab+'_empty').hide();
		$('#'+tab+'_thinking').hide();
		//and show the relevant one
		$('#'+tab+'_'+state).show();
		//and update the global
		tabStates[tab] = state;
	}


// add section behavior

	//cancel the ADD process --> return to $a
	function add_cancel() {
		console.log('add_cancel() called');

		add_switch('a');
		xhr.abort();
		// toast("Query aborted.");
	}

	//switch the .card-content to match $stage
	//essentially the same as fixState('add', 'stage') 
	//  but, yknow, whatever
	function add_switch(stage) {
		console.log('add_switch() called');

		$('section#add .card-content').hide();
		$('section#add .card-action a').hide();
		$('section#add .card-content#add-content-'+stage).show();
		
		if(stage=='a') {
			$('section#add .card-action a#add').show();
			$('section#add input#input').val("");
			$('section#add input#input').focus();
		} else if (stage=='g') {

		} else {
			$('section#add .card-action a#cancel').show();
			$('section#add .card-action a#cancel').click(function() {
				add_cancel();
			});
		}
	}

	//ask what the show is called
	function add_ask() {
		console.log('add_ask() called');

		add_switch('a');
		$("section#add input#input").keyup(function(event) {
			if(event.keyCode == 13) { 
				var title = $('section#add input#input').val();
				add_bring(title);
			}
		});

		$("section#add .card-action a#add").click(function(event) {
			var title = $('section#add input#input').val();
			add_bring(title);
		});
	}

	//bring the search results
	function add_bring(string) {
		console.log('add_bring() called');

		add_switch('b');
		// console.log(string);
		$('section#add .card-content#add-content-b b').text(string);
		var shortname = string.toLowerCase().replace(/\s/g, '-'); //NICE ONE PLANK


		//if the string is empty, it's not a mistake 
		if (!shortname) {
			toast("Type the name of a show you\'d like to follow\ in the input box.");
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
					toast('Something\'s wrong with the database.');
				} else if (data[0]=="0") {
					// no search results
					add_switch('a');
					toast('No Search Results Found');
				} else {
					//next step
					add_switch('c');
					add_choose(string, data);
					// console.log(data);
					if(data.show.length) {
						toast(data.show.length + ' Results Found');
					} else {
						toast('1 Result Found');						
					}
				}
			}
		});
	}

	//choose a show from the results
	function add_choose(string, data) {
		console.log('add_choose() called');

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
			var show_obj = _.findWhere(data.show, {showid: id});
			add_determine(show_obj);
		});
	}

	//determine if you've seen it or not
	function add_determine(show_obj) {
		console.log('add_determine() called');

		var s = _.filter(myBools.models, function(model) {
			return (model.get('show_id') == show_obj.showid);
		});

		if (s.length != 0) {
			//the show already exists
			toast("You're already watching that show!");
			add_cancel();
			return;
		}

		add_switch('d');
		$('#add-content-d h5 b').text(show_obj['name']);
		// console.log(show);

		$('div#add-content-d a#full').click(function() {
			tryShow(show_obj, true);
			add_finding(show_obj);
		});
		$('div#add-content-d a#part').click(function() {
			add_exactly(show_obj);
		});
		$('div#add-content-d a#empty').click(function() {
			tryShow(show_obj, false);
			add_finding(show_obj);
		});
	}

	//exactly how far thru the show?
	function add_exactly(show_obj) {
		console.log('add_exactly() called');
	}

	//finding episodes
	function add_finding(show_obj) {
		console.log('add_finding() called');

		add_switch('f');
		$('#add-content-f h5 b').text(show_obj['name']);
	}

	//great, it worked
	function add_great(name) {
		console.log('add_great() called');
		add_switch('g');
		$('#add-content-g h5 b').text(name);
		setTimeout(function() {
			add_switch('a');
		},3000)
	}

// queue stuff

	//renders the queue
	function queue_render() {
		console.log('queue_render() called');

		//check that the rendering is valid
		if (myBools.length != myShows.length) { return; }

  		update_queued();

	  	var showTemplate 	= _.template( $('#queue-item-template').html() );
	  	var episode_template = _.template( $('#episode-template').html() );
	  	var moreTemplate 	= _.template( $('#more-template').html() );

		$("section#queue #queue_full").empty(); //empty #queue_full with each render
	  	
	  	//for every show in global myShows
	  	_.each(myShows.models, function(thisShow, show_index) {
	  		
		  	var show_id = thisShow.get('show_id');
	  		
	  		if(calculate_queued(show_id)==0) { return; }	//if all seen, skip entirely

	  		var showTemplateData = {
		        'showname'	: thisShow.get('name'),
		        'unseen'	: calculate_queued(show_id),
		        'showid'	: thisShow.get('show_id')
		  	};

			$("section#queue #queue_full").append( showTemplate(showTemplateData) );

			var el = $("section#queue #queue_full li#"+show_id);

			//these are all show-specific
	  		var show = thisShow.get('episodes');
	  		var queuedPerShow = 0;
	  		var isOverflow = false;

		  	//this performs a search so that we don't have to later
		  	//gets the array from global myBools which we're on, according to show_id
			var array = _.first(_.filter(myBools.models, function(model) {
				return (model.get('show_id') == show_id);
			})).get('array');

  			//for every season in the show
			_.each(show, function(season, season_index) {
	  			//for every episode in the season
	  			_.each(season, function(ep, ep_index) {
	  				var seen = array[season_index][ep_index]; //boolean for seen || queued

	  				if(seen) { return; } //if it's queued

	  				if(!hasItAired(ep.airdate)) { return; } //if it's unaired

  					queuedPerShow++;
  					if (queuedPerShow > queueLimit) {
  						isOverflow = true;
  					}
  						  					
  					var episode_templateData = {
  						'show_id' 	: show_id,
				        's' 		: season_index+1,
				        'e' 		: pad(ep_index+1, 2),
				        'j' 		: season_index,
				        'k' 		: ep_index,
				        'title' 	: ep.title,
				        'icon' 		: pickIcon(seen, ep.airdate),
				        'color' 	: pickColor(seen, ep.airdate),
				        'extra' 	: isOverflow,
				        'hiding'	: isOverflow ? 'none' : 'inline-block',
				        'disabled'  : false,
				        'classDisabled' : ''
  					};

  					//print it
					$("section#queue #queue_full li#"+show_id+" p").append( 
						episode_template(episode_templateData) 
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
	  		
	  		var disabled = $(this).attr('data-disabled');

	  		if(disabled=='true') {return;}

	  		toggleSeen(showid, season, episode);
	  		
	  		toggleEl($(this));

	  		update_queued(showid);

	  		update_queued();

	  	});

	  	//toggle .extra on a.more click
		$("section#queue a.more").click(function() {
			$('#queue_full li#'+$(this).attr('id')+" p a.extra").toggle();

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

	//generalized function
	//  if no $showid supplied, updates all
	//  if    $showid supplied, updates just that
	function update_queued(showid) {
		if(_.isUndefined(showid)) {
			var qd = calculate_queued();
			if (qd == 0) { qd = 'Nothing'; }
			var el = $("span#totalQueued");
			el.html(qd);
		} else { //if defined, update in queue / manage
			var qd = calculate_queued(showid);
			var q_el = $("section#queue li#"+showid+" span.unseen");
			var m_el = $("section#manage span.unseen");
			q_el.html(qd);
			m_el.html(qd);
		}
	}

	//calculates the viable episodes per season in a show
	function calculate_viable(showid, season){
		var num = 0;
		//calculate just for one
		var array = _.first(_.filter(myBools.models, function(i) {
			return (i.get('show_id') == showid);
		})).get('array');

		var eps = _.first(_.filter(myShows.models, function(showModel) {
				return (showModel.get('show_id') == showid);
		})).get('episodes');

		_.each(array[season], function(e, j) {
			var hasAired = hasItAired(
				eps[season][j].airdate
			);
			if(hasAired) {num++};
		});

		return num;
	}

	//generalized recursive function
	// if $showid exists, calculate just for that
	//	else, calculate all qd
	function calculate_queued(showid, season) {
		// console.log('calculating queued');
		
		if (myBools.length != myShows.length) { return; } //skip if not ready

		var num = 0;
		if(_.isUndefined(showid)) {
			//calculate for all
			_.each(myBools.models, function(boolModel) {
				num += calculate_queued(boolModel.get('show_id'));
			});
		} else {
			//calculate just for one
			var show = _.first(_.filter(myBools.models, function(i) {
				return (i.get('show_id') == showid);
			}));
			var array = show.get('array');

			if(_.isUndefined(season)){
				for(var i in _.range(array.length)){
					num += calculate_queued(showid, i);
				}
			} else {
				var eps = _.first(_.filter(myShows.models, function(showModel) {
					return (showModel.get('show_id') == showid);
				})).get('episodes');

				_.each(array[season], function(e, j) {
					if( !e && hasItAired( eps[season][j].airdate ) ) {num++};
				});
			}			
		}
		return num;
	}

// manage stuff

	//renders the MANAGE block
	function manage_render() {
		// console.log(myBools);
		console.log('manage_render() called');

		//check that rendering is valid
		if (myBools.length != myShows.length) { return; }

		//remind user of performance issues
		if (myBools.length > 15) {
			toast('For best performance, remove shows that are off the air.', longTime);
		}

		//define templates
	  	var manage_template				= _.template( $('#manage-item-template').html() );

		//empty #manage_full
		$("section#manage #manage_full").empty();

		//print all elements
		_.each(myShows.models, function(thisShow, index) {

		  	var show_id  = thisShow.get('show_id');
	  		var episodes = thisShow.get('episodes');
	  		var thisBool = _.find(myBools.models, function(item) { return item.get('show_id') === show_id; });
	  		
	  		var manage_data = {
		        'showname'		: thisShow.get('name'),
		        'unseen'		: calculate_queued(show_id),
		        'showid'		: show_id,
		        'num_seasons'	: thisShow.get('episodes').length
		  	};

			$("section#manage #manage_full").append( manage_template(manage_data) );

		});

		//expand click behaviors
		var isExpanded = false;

		//expand div on a#expand click	
		$('section#manage a.expand').click(function() {
			if(isExpanded) { 
				$(this).children('i').html('expand_more');
				isExpanded = false;
				var id = $(this).attr('id');
				$("section#manage span#"+id+".manage-expanded").empty();
			} else {
				$(this).children('i').html('expand_less');
				isExpanded = true;				

				var id = $(this).attr('id');
				var cinit = calculate_initial_display_season(id);

				manage_actions_render(id);
				manage_nav_render( id, cinit );
				manage_season_render( id, cinit );
			}
		});

		//update lenses at least once per render
		lenses_render();
	}


	function manage_actions_render(id){
		
		var thisShow = _.first(_.filter(myShows.models, function(model) {
			return (model.get('show_id') == id);
		}));

	  	var template	= _.template( 
	  		$('#manage-actions-template').html() 
  		);

  		var data = {
  			showid 	: 	thisShow.get('show_id'),
  			name 	: 	thisShow.get('name'),
  		}

		$('span#'+id+'.manage-expanded').append(
			template(data)
		)

		$('.act-row a').unbind()

		//take action on a.click
		$('.act-row a').click(function() {
			var showid 	= $(this).attr('data-id');
			var name 	= $(this).attr('data-name');
			var action 	= $(this).attr('id');
			if(action=='delete') {
				manage_delete(showid, name);				
			} else if (action=='reset') {
				manage_set_all(showid, name, false);
			} else if (action=='set') {
				manage_set_all(showid, name, true);
			}
			//don't re-render - just toggleSeen for all eps in shw
			//for each .episode


			//BUG BUG BUG BUG BUG BUG BUG BUG BUG
			_.each($('.manage-expanded#episodes a.episode'), function(i) {
				toggleEl($(i));
			});

			update_queued();
			update_queued(showid);

			lenses_render(showid);
		});
	}

	function manage_season_render(id, season_index){

		var thisShow = _.first(_.filter(myShows.models, function(model) {
			return (model.get('show_id') == id);
		}));
  		var thisBool = _.find(myBools.models, function(item) { return item.get('show_id') == id; });

  		var episodes = thisShow.get('episodes');

		var season_template = _.template( $('#manage-season-template').html() );

		var episode_template = _.template( $('#episode-template').html() );

		var season_el = $('span#'+id+'.manage-expanded');
		
		season_el.append( season_template() );

		var eps_el = $('li.eps-row div div#box');
  		// console.log(eps_el);

  		// var el = $('section#manage .manage-expanded div.episodes div#'+id+'x'+season_index);
		_.each(episodes[season_index], function(ep, ep_index) {

			var seen = thisBool.get('array')[season_index][ep_index];

				var episode_templateData = {
					'showid' 	: id,
					'show_id' 	: id,
			        's' 		: season_index+1,
			        'e' 		: pad(ep_index+1, 2),
			        'j' 		: season_index,
			        'k' 		: ep_index,
			        'title' 	: ep.title,
			        'icon' 		: pickIcon(seen, ep.airdate),
			        'color' 	: pickColor(seen, ep.airdate),
			        'extra' 	: false,
			        'hiding'	: false,
			        'disabled'	: !hasItAired(ep.airdate),
			        'classDisabled' : hasItAired(ep.airdate)?'':'disabled'
				};

			eps_el.append( episode_template(episode_templateData) );
		});

		//toggle seen/queued on a.episode click
	  	$("section#manage a.episode").click(function() {
	  		var showid	= $(this).attr('data-show');
	  		var season	= $(this).attr('data-season');
	  		var episode	= $(this).attr('data-episode');
	  		
	  		var disabled = $(this).attr('data-disabled');

	  		if(disabled=='true') {return;}

	  		toggleSeen(showid, season, episode); //toggles the data backend - sends a parse query
	  		
	  		toggleEl($(this)); //toggles the visual appearance
	  		
			update_queued(); //in navbar
			update_queued(showid); //in manage side

			lenses_render(id, season_index); //rerenders lenses - but only the necessary one
	  	});
	}

	function manage_nav_render(id, season_index){
		var thisShow = _.first(_.filter(myShows.models, function(model) {
			return (model.get('show_id') == id);
		}));

	  	var template	= _.template( 
	  		$('#manage-nav-template').html() 
  		);

  		var data = {
  			'showid' 	 	: 	id,
  			'season_index' 	: 	season_index,
  			'season_num'	:  	String(season_index+1), 
  			'num_seasons'	: 	thisShow.get('episodes').length
  		}

		$('span#'+id+'.manage-expanded').append(
			template(data)
		)

		$('li.nav-row a').unbind();

		$('li.nav-row a#left, li.nav-row a#right').click(function() {
			$('span#'+id+'.manage-expanded').empty();
			manage_actions_render( id );

			var direction = $(this).attr('id');
			var index = $(this).attr('data_index');
			var newIndex = index;

			if ( direction == 'left' ){
				newIndex--;
			} else if ( direction == 'right' ) {
				newIndex++;
			}

			manage_nav_render( id, newIndex );
			manage_season_render( id, newIndex );

			// console.log(direction);
			// console.log(index);
		});

	}

	//toggles an episode's element block
	function toggleEl(el) {
		el.toggleClass('lighten-2');
	  		
  		if( el.children('i').html()=='check_box' ) {
	  		el.children('i').html('check_box_outline_blank');
  		} else {
	  		el.children('i').html('check_box');
  		}
	}

	//deletes a show
	function manage_delete(showid, name) {
		console.log('manage_delete() called');
		var len = myBools.length;
		boolResult = _.first(myBools.filter(function(model) {
  			return model.get('show_id') == showid;
  		}));

  		showResult = _.first(myShows.filter(function(model) {
  			return model.get('show_id') == showid;
  		}));

		toast('Deleted ' + name); //let em know
  		
  		boolResult.destroy(); //destroy bool
  		myShows.remove(showResult); //remove show

		$('section#manage span#'+showid+'.manage-expanded').remove(); //destroy all relevant divs
		$('section#manage li.manage-item#'+showid).remove(); //destroy all relevant divs

		update_queued();			
	}

	//sets all seen / queued for a show
	function manage_set_all(showid, name, allSeen) {
		console.log('manage_set_all() called');

		thisBools = _.first(myBools.filter(function(model) {
  			return model.get('show_id') == showid;
  		}));

  		array = _.first(myShows.filter(function(model) {
  			return model.get('show_id') == showid;
  		})).get('episodes');

  		var tempArray = thisBools.get('array');
  		_.each(tempArray, function(i_item, i_index) {
  			_.each(i_item, function(j_item, j_index) {
  				var hasAired = hasItAired(array[i_index][j_index].airdate);
  				console.log(hasAired);
  				if(!hasAired){
	  				tempArray[i_index][j_index] = false;
  				} else {
	  				tempArray[i_index][j_index] = allSeen;
  				}
  			});
  		});

  		if(allSeen) {
			toast('Marked all episodes of ' + name + ' as seen.');
  		} else {
			toast('Queued all episodes of ' + name + '.');
  		}
		thisBools.set('array', tempArray);
		thisBools.save();

		update_queued();
	}

	// generalized lens rendering function
	// if showid is undefined, runs lenses_render(showid) on ALL models 
	function lenses_render(showid, season) {
		// console.log('lenses_render('+showid+') called');

		if(myBools.length==0 || myShows.length==0){return;}

		if (_.isUndefined(showid)) {
			_.each(myBools.models, function(model){
				lenses_render(model.get('show_id'));
			});
		} else if (_.isUndefined(season)) {
			// console.log(showid);
			var array = _.first(_.filter(myBools.models, function(model) {
				return (model.get('show_id') == showid);
			})).get('array');
			for(var i in _.range(array.length)){
				lenses_render(showid, i);
			}
		} else {
			// console.log(showid + ' ' + season);
			var array = _.first(_.filter(myBools.models, function(model) {
				return (model.get('show_id') == showid);
			})).get('array');

			for(var i in _.range(array[season].length)){
				
				//of the form #12345x0dot, where 12345 is the showid and 0 is the season index
				var el = $( '#' + showid + 'x' + i + 'dot');

				el.attr('class', 'material-icons'); //removes all classes except one

				if (calculate_queued(showid, i) == 0) { 
					//completely seen season
					el.html('radio_button_unchecked');
					el.addClass('light-green-text');
				} else if (calculate_queued(showid, i) == calculate_viable(showid, i)) { 
					//completely unseen season
					el.html('lens');
					el.addClass('green-text');
				} else {
					//partially seen season
					el.html('timelapse');
					el.addClass('light-green-text');					
				}
			}
		
		}
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
	function toast(str, num) {
		// console.log('toast() called: ' + str);

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

	//given a show $id, calculates the index of the season on which to open the tab -- if the first season is entirely seen, start from the second
	function calculate_initial_display_season(id){
		var array = _.first(_.filter(myBools.models, function(model) {
				return (model.get('show_id') == id);
		})).get('array');

		var initial_display_season = 0;
		var found = false;
		for (var i = 0; i < array.length; i++){
			for (var j = 0; j < array[i].length; j++){
				if (array[i][j] == false && found == false){
					initial_display_season = i;
					found = true;
				}
			}
		}

		if(found == false){
			initial_display_season = array.length;
			found = true;
		}

		return initial_display_season;
	}

	//returns a boolean; true if the $date is before global $today
	function hasItAired(airdate) {
		return moment(airdate).isBefore();
	}

	function pickIcon(isSeen, airdate) {
		// console.log(hasItAired(airdate));
		if (!hasItAired(airdate)) {
			return 'select_all';
		} else {
			return !isSeen ? 'check_box_outline_blank' : 'check_box';			
		}
	}

	function pickColor(isSeen, airdate) {
		if (!hasItAired(airdate)) {
			return 'grey';
		} else {
			return isSeen ? 'green lighten-2' : 'green';
		}
	}

	//returns a capitalized $string
	function capitalize(string) {
	    return string.toUpperCase();
	}

});