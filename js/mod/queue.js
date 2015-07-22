//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// TELEVIS.IO QUEUE TAB FUNCTIONS

//renders the queue
function queue_render() {
	// console.log('queue_render() called');

	//check that the rendering is valid
	if (myBools.length != myShows.length) { return; }

	update_queued();

	$("section#queue ul#queue_items").empty(); //empty #queue_full with each render
  	
  	//render each show in myShows
  	_.each(myShows.models, function(thisShow) {
  		queue_render_show(thisShow);
  	});

	//initialize tooltips
	$('.tooltipped').tooltip({delay: 50});

  	//update seen + toggle checked on a.episode click
  	$("section#queue a.episode").click(function() {
  		queue_toggle($(this));
  	});

  	//toggle .extra on a.more click
	$("section#queue a.more").click(function() {
		queue_expand($(this));
	});

	//toggle new tab on a.watch click
	$("section#queue a.watch").click(function(){
		queue_watch($(this));
	});

	if (isEmpty($(' section#queue div#settings'))){
		// console.log('rendering');
		queue_settings_render();
	}
}



function queue_settings_render(){
  	var comparatorsTemplate = _.template( $('#comparators-template').html() );

	$("section#queue div#settings").empty().append( comparatorsTemplate()  );

	$('section#queue div#settings a.sortby').click(function(){
		$('section#queue div#settings a.sortby').addClass('white grey-text');
		$('section#queue div#settings a.sortby').removeClass('grey white-text');
		$(this).toggleClass('white grey white-text grey-text');
		shows_sort($(this).attr('id'), 'queue');
	});
}

function shows_sort(type, panel){
	if(type!=comparatorType){
		myShows.swapComparator(type);
		myShows.sort();
		// console.log(myShows.models);
		if(panel=='queue'){
			queue_render();			
		} else if (panel=='manage'){
			render_manage();			
		}
		// console.log(type);
		comparatorType = type;
	} else {
		return;
	}
}

//renders a particular show in the queue
function queue_render_show(show){
	var show_id = show.get('show_id');
	var limit = queueLimit;
	var numqueued = calculate_queued(show_id);

	if(numqueued==0) { 
		return; //if all seen, skip entirely
	}

  	var showTemplate 		= _.template( $('#queue-item-template').html() );
  	var episode_template 	= _.template( $('#episode-template').html() );
  	var moreTemplate 		= _.template( $('#more-template').html() );

	var showData = {
	    'showname'	: show.get('name'),
	    'unseen'	: numqueued,
	    'showid'	: show.get('show_id')
	};

	$("section#queue ul#queue_items").append(
		showTemplate(showData)
	);

	var el = $("section#queue ul#queue_items li#"+show_id);

	//these are all show-specific
	var library = show.get('episodes');
	var count = 0;
	var isOverflow = false;

	//this performs a search so that we don't have to later
	//gets the array from global myBools which we're on, according to show_id
	var array = myBools.match(show_id).get('array');

	//for every season in the show
	_.each(library, function(season, season_index) {
		
		//for every episode in the season
		_.each(season, function(ep, ep_index) {
			var seen = array[season_index][ep_index]; 

			if( seen || !grok_airdate(ep.airdate)) { 
				return; //skip if seen or unaired
			}

			count++;
			
			if (count > limit) { isOverflow = true; }
				  					
			var epData = {
				'show_id' 	: show_id,
		        's' 		: season_index+1,
		        'e' 		: pad(ep_index+1, 2),
		        'j' 		: season_index,
		        'k' 		: ep_index,
		        'title' 	: ep.title,
		        'icon' 		: pick_icon(seen, ep.airdate),
		        'color' 	: pick_color(seen, ep.airdate),
		        'overflow' 	: isOverflow,
		        'airdate' 	: ep.airdate,
		        'hiding'	: isOverflow ? 'none' : 'inline-block',
		        'disabled'  : false,
		        'classDisabled' : '',
		        'seen'		: seen
			};

			$("section#queue ul#queue_items li#"+show_id+" p").append( 
				episode_template(epData) 
			);
		});
	});

	// if there's overflow, write the MORE button
	if (isOverflow) {
		moreData = {	
			'showid'	:	show_id,
			'more'		:	String(count - limit)
		};
		el.children('p').append( moreTemplate(moreData) );
	}
}

//toggles a queue episode; view and model
function queue_toggle(el){
	var showid  = el.attr('data-show');
	var season  = el.attr('data-season');
	var episode = el.attr('data-episode');
	
	var disabled = el.attr('data-disabled');

	if(disabled=='true') {return;}

	toggle_seen(showid, season, episode);
	
	toggle_el(el);

	update_queued(showid);

	update_queued();
}

//expands a queue item
function queue_expand(el){
	$('section#queue #queue_full li#'+el.attr('id')+" p a.overflow").toggle();

	el.children('i').toggleClass('left');
	el.children('span.text').toggle();

	//attributes can't be booleans
	if (el.attr('data-toggled') == 'false') {
		el.children('i').html('expand_less');
		el.attr('data-toggled', 'true');
	} else {
		el.children('i').html('expand_more');	
		el.attr('data-toggled', 'false');
	}
}

//generates a url and opens it
function queue_watch(el){
	var id = el.attr('id');
	var obj = calculate_whichFrom(id);
	var s = obj['s'];
	var e = obj['e'];
	var show = myShows.match(id);
	var name = show.get('name');
	var ep = show.get('episodes')[s][e];
	var str = "watch " + name + " online streaming " + ep['title'] + ' S' + String(s+1) + 'E' + pad(e+1, 2);
	var url = "http://www.google.com/search?q=" + str.split(' ').join('+');
	window.open(url, '_blank');
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
		var m_el = $("section#manage li#"+showid+" span.unseen");
		q_el.html(qd);
		m_el.html(qd);
	}
}

//calculates the viable episodes per season in a show
function calculate_viable(showid, season){
	var num = 0;
	//calculate just for one
	var array = myBools.match(showid).get('array');

	var eps = myShows.match(showid).get('episodes');

	_.each(array[season], function(e, j) {
		var hasAired = grok_airdate(
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

	if (myBools.length != myShows.length) { return; } //skip if not ready

	var num = 0;
	if(_.isUndefined(showid)) {
		//calculate for all
		_.each(myBools.models, function(boolModel) {
			num += calculate_queued(boolModel.get('show_id'));
		});
	} else { //if showid is defined
		//calculate just for one
		var show = myBools.match(showid);
		if(_.isUndefined(show)){
			return;
		}
		var array = show.get('array');

		if(_.isUndefined(season)){
			for(var i in _.range(array.length)){
				num += calculate_queued(showid, i);
			}
		} else { //if season is defined
			var eps = myShows.match(showid).get('episodes');

			_.each(array[season], function(e, j) {
				if( !e && grok_airdate( eps[season][j].airdate ) ) {num++};
			});
		}			
	}
	return num;
}
