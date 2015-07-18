//  _       _            _       _       
// | |_ ___| | _____   _(_)___  (_) ___  
// | __/ _ \ |/ _ \ \ / / / __| | |/ _ \ 
// | ||  __/ |  __/\ V /| \__ \_| | (_) |
//  \__\___|_|\___| \_/ |_|___(_)_|\___/ 
//
// TELEVIS.IO UTILITY FUNCTIONS


//pushes an alert to the box in the corner
function make_toast(str, num) {
	// console.log('make_toast() called: ' + str);

	if(!_.isUndefined(num)) {
		Materialize.toast(str, num);
	} else {
		Materialize.toast(str, shortTime);			
	}
}

//returns an array of multiple dimensions; accepts multiple variables
function create_array(length) {
	// console.log('create_array() called');

    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = create_array.apply(this, args);
    }

    return arr;
}

//pads a number $n to width $w with zero character $z
function pad(n, w, z) {
	z = z || '0';
	n = n + '';
	return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
}

//given a show $id, 
//calculates the index of the season on which to open the tab 
//if the first season is entirely seen, start from the second
function calculate_whereFrom(id){
	var array = myBools.match(id).get('array');

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
		initial_display_season = array.length-1; //actual length
		found = true;
	}

	return initial_display_season;
}

//given a show $id, 
//calculates the index of the season on which to open the tab 
//if the first season is entirely seen, start from the second
function calculate_whichFrom(id){
	var array = myBools.match(id).get('array');

	var season = 0;
	var episode = 0;
	var found = false;
	for (var i = 0; i < array.length; i++){
		for (var j = 0; j < array[i].length; j++){
			if (array[i][j] == false && found == false){
				season = i;
				episode = j;
				found = true;
			}
		}
	}

	if(found == false){
		initial_display_season = array.length-1; //actual length
		found = true;
	}

	return {
		's' : season,
		'e': episode
	};
}

//returns a boolean; true if the $date is before global $today
function grok_airdate(airdate) {
	return moment(airdate).isBefore();
}

//returns a checked/unchecked/unaired icon based on seen / airdate
function pick_icon(isSeen, airdate) {
	// console.log(grok_airdate(airdate));
	if (!grok_airdate(airdate)) {
		return 'select_all';
	} else {
		return !isSeen ? 'check_box_outline_blank' : 'check_box';			
	}
}

//returns a checked/unchecked/unaired color based on seen / airdate
function pick_color(isSeen, airdate) {
	if (!grok_airdate(airdate)) {
		return 'grey';
	} else {
		return isSeen ? 'green lighten-2' : 'green';
	}
}

//returns a capitalized $string
function capitalize(string) {
    return string.toUpperCase();
}