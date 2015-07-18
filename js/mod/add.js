//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// TELEVIS.IO ADD TAB FUNCTIONS

//cancel the ADD process --> return to $a
function add_cancel() {
	console.log('add_cancel() called');

	add_switch('a');
	xhr.abort();
	// make_toast("Query aborted.");
}

//switch the .card-content to match $stage
//essentially the same as fix_state('add', 'stage') 
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
		make_toast("Type the name of a show you\'d like to follow\ in the input box.");
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
				make_toast('Something\'s wrong with the database.');
			} else if (data[0]=="0") {
				// no search results
				add_switch('a');
				make_toast('No Search Results Found');
			} else {
				//next step
				add_switch('c');
				add_choose(string, data);
				// console.log(data);
				if(data.show.length) {
					make_toast(data.show.length + ' Results Found');
				} else {
					make_toast('1 Result Found');						
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

	var s = myBools.query(show_obj.showid);

	if (s.length != 0) {
		//the show already exists
		make_toast("You're already watching that show!");
		add_cancel();
		return;
	}

	add_switch('d');
	$('#add-content-d h5 b').text(show_obj['name']);
	// console.log(show);

	$('div#add-content-d a#full').click(function() {
		try_show(show_obj, true);
		add_finding(show_obj);
	});
	$('div#add-content-d a#part').click(function() {
		add_exactly(show_obj);
	});
	$('div#add-content-d a#empty').click(function() {
		try_show(show_obj, false);
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


//given a $showObj OBJ and its status $seen,
//	look for it on Parse
//	if it exists, 
//		fetch its eps
//	if it doesn't,
//		create it and fetch its eps 
function try_show(showObj, seen) {
	console.log('try_show() called');

	var query = new Parse.Query(Parse.Object.extend("Show"));
	query.equalTo("show_id", parseInt(showObj.showid));
	query.find({
	  	success: function(results) {
		  	if (results.length != 0) { //if the show exists
		  		var showModel = _.first(results);
	    		fetch_eps(showModel, seen); //async
	    		make_toast("Getting '"+showModel.get('name')+"'...")
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
			    		make_toast("Getting '"+showModel.get('name')+"'...");
						fetch_eps(showModel, seen); //async
					},
					error: function(error) {
						make_toast("Couldn't add show. Something's quite wrong.");
						make_toast('Error: ' + error.code + ' ' + error.message);
					}
				});
		  	}
	  	},
	  	error: function(error) {
	  		make_toast("Couldn't reach Parse. Something's quite wrong.");
	  		make_toast("Error: " + error.code + ' ' + error.message);
	  	}
	});
}

//only called when CREATING a show
//  given a $showModel and a status $seen,
//	  fetch its episodes,
//	  process them,
// 	  and .save() them to the $showModel.
//	then create a BOOLS of the show.
function fetch_eps(showModel, seen) {
	console.log('fetch_eps() called');

	// console.log('getting episodes by model');
	$.ajax({
		url: 'http://www.jbuckland.com/ketchup.php?func=show&query=' + showModel.get('show_id'), 
		dataType: "json",
		type: 'GET',
		success: function(data) {
			showModel.set('episodes', clean_data(data));
			showModel.save();
			try_bools(showModel, seen);
		},
		error: function(error) {
			// console.log(error);
		}
	});
}

//given a $showModel and a status $seen,
//	create a user-specifc BOOLS model and .save() it. 
function try_bools(showModel, seen) {

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
			var array 	= create_array(newBools.get('seasons'),0);

			_.each(show, function(season, i) {
				_.each(season, function(episode, j) {

					if ( !grok_airdate(episode.airdate) ) {
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
					make_toast('Successfully added ' + name); //toast
					add_great(name); //view
					fetch_bools(); //model
				},
				error: function(error) {
					make_toast("There really shouldn't be an error here. Is Parse down?");
				}
			});

		},
		error: function(error) {
			make_toast("There really shouldn't be an error here. Is Parse down?");
		}
	});
}

// takes a $data OBJ and retuns a nicer $result OBJ
function clean_data(data) {
	console.log('clean_data() called');

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



