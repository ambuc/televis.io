//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// TELEVIS.IO ADD TAB FUNCTIONS


var inProgress = false; //is a query in progress?
//used to prevent late-returning ajax queries from disrupting state

//cancel the ADD process --> return to $a
function add_cancel() {
	// console.log('add_cancel() called');

	add_switch('a');
	inProgress = false;
	xhr.abort();
	// yhr.abort();
	// make_toast("Query aborted.");
}

//switch the .card-content to match $stage
//essentially the same as fix_state('add', 'stage') 
//  but, yknow, whatever
function add_switch(stage) {
	// console.log('add_switch() called');
	console.log('inProgress: ' + inProgress);

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
	// console.log('add_ask() called');

	add_switch('a');

	$("section#add input#input").keyup(function(event) {
		if(event.keyCode == 13) { 
			inProgress = true;
			var title = $('section#add input#input').val();
			add_bring(title);
		}
	});

	$("section#add .card-action a#add").click(function(event) {
		// console.log('adding');
		inProgress = true;
		var title = $('section#add input#input').val();
		add_bring(title);
	});
}

//bring the search results
function add_bring(string) {
	// console.log('add_bring() called');

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
	search_shortname(shortname, string);
}

//choose a show from the results
function add_choose(string, data) {
	// console.log('add_choose() called');

	//if there's only one search result, wrap it in an array
	
  	var template = _.template( 
  		$('#search-results-template').html()
	);

  	var templateData = { results: data };
	$("#add-content-c span").html( template(templateData) );

	$("#add-content-c .collection a").click(function() {
		var id = $(this).attr('id');
		var show_obj = _.findWhere(data, {showid: id});
		add_determine(show_obj);
	});
}

//determine if you've seen it or not
function add_determine(show_obj) {
	// console.log('add_determine() called');
	var id = show_obj.showid;
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
	// console.log('add_exactly() called');
}

//finding episodes
function add_finding(show_obj) {
	// console.log('add_finding() called');

	add_switch('f');
	$('#add-content-f h5 b').text(show_obj['name']);
	inProgress = false;
}

//great, it worked
function add_great(name) {
	// console.log('add_great() called');
	add_switch('g');
	$('#add-content-g h5 b').text(name);
	setTimeout(function() {
		add_switch('a');
	},3000)
}