/**
 * Generates a table showing the scores for each revision returned from Quary
 * 
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
 */
( function ( mw, $ ) {
	'use strict';
	var model = 'damaging',
		scores = {},
		$target,
		// From https://quarry.wmflabs.org/query/4947
		quarryUrl = 'https://quarry.wmflabs.org/run/36990/output/0/json?download=true',
		oresUrl = '//ores.wmflabs.org/scores/' + mw.config.get( 'wgDBname' ) + '/';
	function showTable ( pages ) {
		var i, page, $row, score, revid,
			$table = $( '<table><tbody><tr><th>Score</th><th>Revision</th></tr></tbody></table>' )
				.addClass( 'wikitable sortable' ),
			$tbody = $table.find( 'tbody' );
		for ( i = 0; i < pages.length; i++ ) {
      		page = pages[i];
			if ( page.score <= 0.5 ) {
				continue;
			}
			revid = page.revid;
			score = ( 100 * page.score ).toFixed(0);
			$row = $( '<tr>' )
				.append(
					$( '<td>' ).append(
						$( '<a>' )
							.attr(
								'href',
								oresUrl + '?models=' + model +
									'&revids=' + revid
							)
							.text( score + '%' )
					),
					$( '<td>' ).append(
						$( '<a>' )
							.attr( 'href', mw.util.getUrl( '', {
								diff: revid
							} ) )
							.text( page.revid )
					)
				);
			$tbody.append( $row );
		}
		$( '#mw-content-text' ).empty()
		.append(
			$table.tablesorter()
		);
	}
	function processScores( data ) {
		var pages = [];
		$.each( data, function( revid, scores ) {
			var score = scores[ model ];
			pages.push( {
				revid: revid,
				score: score && !score.error ? score.probability['true'] : 0
			} );
		} );
		pages = pages.sort( function( a, b ){
			return b.score - a.score;
		} );
		showTable( pages );
	}

	function getScores( revids, start ) {
		var batchSize = 50;
		start = start || 0;
		$.ajax( {
			url: oresUrl,
			data: {
				models: 'damaging',
				revids: revids
					.slice( start, start + batchSize )
					.join( '|' )
			},
			dataType: 'jsonp'
		} )
		.done( function ( newScores ) {
			$.extend( scores, newScores );
			start = start + batchSize;
			console.log( start, revids.length );
			if ( start < revids.length ) {
				$( '#mw-content-text' ).html(
					$( '<p></p>' ).text(
						'Getting scores: ' + ( start / revids.length * 100 ).toFixed(0) + '%'
					)
				);
				getScores( revids, start );
			} else {
				console.log( 'processScores', scores );
				processScores( scores );
			}
		} );
	}

	function getRevIdsFromQuarry() {
		var url = prompt( 'Enter a quarry URL returning the JSON with the revids:', quarryUrl );
		if ( url ) {
			$.getJSON( url ).done( function( data ) {
				getScores( $.map( data.rows, function ( row ) {
					return row[0];
				} ) );
			} );
		}
	}

	if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Blankpage' &&
			mw.config.get( 'wgTitle' ).split('/')[1] === 'TopRevisionsByScore'
	) {
		$.when(
			mw.loader.using( [ 'mediawiki.util', 'jquery.tablesorter' ] ),
			$.ready
		).then( getRevIdsFromQuarry );
	}

}( mediaWiki, jQuery ) );
