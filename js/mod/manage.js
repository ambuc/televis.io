//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// TELEVIS.IO MANAGE TAB FUNCTIONS
                                      
//renders the MANAGE block
function render_manage() {
	// console.log(myBools);
	console.log('render_manage() called');

	//check that rendering is valid
	if (myBools.length != myShows.length) { return; }

	//remind user of performance issues
	if (myBools.length > 15) {
		make_toast('For best performance, remove shows that are off the air.', longTime);
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
			var cinit = calculate_whereFrom(id);

			render_manage_actions(id);
			render_manage_nav( id, cinit );
			render_manage_season( id, cinit );
		}
	});

	//update lenses at least once per render
	render_lenses();
}


function render_manage_actions(id){
	
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
		manage_action($(this));
	});
}

function render_manage_season(id, season_index){

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
		        'icon' 		: pick_icon(seen, ep.airdate),
		        'color' 	: pick_color(seen, ep.airdate),
		        'overflow' 	: false,
		        'airdate' 	: ep.airdate,
		        'hiding'	: false,
		        'disabled'	: !grok_airdate(ep.airdate),
		        'classDisabled' : grok_airdate(ep.airdate)?'':'disabled',
		        'seen' 		: seen
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

  		toggle_seen(showid, season, episode); //toggles the data backend - sends a parse query
  		
  		toggle_el($(this)); //toggles the visual appearance
  		
		update_queued(); //in navbar
		update_queued(showid); //in manage side

		render_lenses(id, season_index); //rerenders lenses - but only the necessary one
  	});
}

function render_manage_nav(id, season_index){
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
		render_manage_actions( id );

		var direction = $(this).attr('id');
		var index = $(this).attr('data_index');
		var newIndex = index;

		if ( direction == 'left' ){
			newIndex--;
		} else if ( direction == 'right' ) {
			newIndex++;
		}

		render_manage_nav( id, newIndex );
		render_manage_season( id, newIndex );

		// console.log(direction);
		// console.log(index);
	});
}

// generalized lens rendering function
// if showid is undefined, runs render_lenses(showid) on ALL models 
function render_lenses(showid, season) {
	// console.log('render_lenses('+showid+') called');

	if(myBools.length==0 || myShows.length==0){return;}

	if (_.isUndefined(showid)) {
		_.each(myBools.models, function(model){
			render_lenses(model.get('show_id'));
		});
	} else if (_.isUndefined(season)) {
		// console.log(showid);
		var show = _.first(_.filter(myBools.models, function(model) {
			return (model.get('show_id') == showid);
		}))
		
		if(_.isUndefined(show)){ return; }
		
		var array = show.get('array');
		
		for(var i in _.range(array.length)){
			render_lenses(showid, i);
		}
	} else {
		// console.log(showid + ' ' + season);
		var show = _.first(_.filter(myBools.models, function(model) {
			return (model.get('show_id') == showid);
		}));

		if(_.isUndefined(show)){ return; }
		
		var array = show.get('array');

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

	make_toast('Deleted ' + name); //let em know
		
	console.log(myShows.length);
	boolResult.destroy(); //destroy bool
	myShows.remove(showResult); //remove show
	console.log(myShows.length);
	if(myShows.length==0){
		fix_state('manage', 'empty');
	} else {
		$('section#manage span#'+showid+'.manage-expanded').remove(); //destroy all relevant divs
		$('section#manage li#'+showid+'.manage-item').remove(); //destroy all relevant divs
	}

	update_queued();
}

function manage_action(el){
	var showid 	= el.attr('data-id');
	var name 	= el.attr('data-name');
	var action 	= el.attr('id');
	var state = (action=='reset')?false:true;

	//MODEL - backend updating works great
	if(action=='delete') {
		manage_delete(showid, name);				
	} else if (action=='reset') {
		manage_set_all(showid, name, state);
		_.each($('span.manage-expanded li.eps-row a.episode'), function(i) {

		});
	} else if (action=='set') {
		manage_set_all(showid, name, state);
	}
	//don't re-render - just toggleSeen for all eps in shw
	//for each .episode

	//BUG BUG BUG BUG BUG BUG BUG BUG BUG
	_.each($('.manage-expanded li.eps-row a.episode'), function(i) {
		if($(i).attr('data-seen')!=String(state)){
			toggle_el($(i));				
		}
	});

	update_queued();
	update_queued(showid);

	render_lenses(showid);
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
				var hasAired = grok_airdate(array[i_index][j_index].airdate);
				console.log(hasAired);
				if(!hasAired){
  				tempArray[i_index][j_index] = false;
				} else {
  				tempArray[i_index][j_index] = allSeen;
				}
			});
		});

		if(allSeen) {
		make_toast('Marked all episodes of ' + name + ' as seen.');
		} else {
		make_toast('Queued all episodes of ' + name + '.');
		}
	thisBools.set('array', tempArray);
	thisBools.save();

	update_queued();
}

