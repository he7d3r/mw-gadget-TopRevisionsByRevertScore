/**
 * Generates a table showing the scores for each revision returned from Quary
 *
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
 */
( function ( mw, $ ) {
	'use strict';
	var models = [ 'damaging', 'goodfaith' ],
		damagingScoreThreshold = 0.7,
		scores = {},
		// From https://quarry.wmcloud.org/query/5093
		quarryUrl = 'https://quarry.wmcloud.org/run/832579/output/0/json',
		oresUrl = '//ores.wikimedia.org/v3/scores/' + mw.config.get( 'wgDBname' ) + '/';
	function showTable( pages ) {
		var c, i, page, revid, row, url, score,
			table = '{| class="wikitable sortable"\n|+ Edits by score\n',
			headers = [ 'Revision', 'Status' ];
		for ( c = 0; c < models.length; c++ ) {
			headers.unshift( models[ c ] );
		}
		table += '! ' + headers.join( ' !! ' );
		for ( i = 0; i < pages.length; i++ ) {
			page = pages[ i ];
			if ( page.score[ 0 ] <= damagingScoreThreshold ) {
				continue;
			}
			revid = page.revid;
			row = [
				'[[Special:Diff/' + revid + '|' + revid + ']]',
				''
			];
			url = oresUrl + '?models=' + models.join( '%7C' ) + '&revids=' + revid;
			for ( c = 0; c < models.length; c++ ) {
				score = ( 100 * page.score[ c ] ).toFixed( 0 );
				row.unshift( '[' + url + ' ' + score + '%]' );
			}
			table += '\n|-\n|' + row.join( ' || ' );
		}
		table += '\n|}';
		$( '#mw-content-text' ).empty()
			.append( $( '<pre>' ).text( table ) );
	}
	function processScores( data ) {
		var pages = [];
		$.each( data, function ( revid, scores ) {
			var i, score,
				data = {
					revid: revid
				};
			data.score = [];
			for ( i = 0; i < models.length; i++ ) {
				score = scores[ models [ i ] ].score;
				data.score.push( score && !score.error ? score.probability[ 'true' ] : 0 );
			}
			pages.push( data );
		} );
		pages = pages.sort( function ( a, b ) {
			return b.score[ 0 ] - a.score[ 0 ];
		} );
		showTable( pages );
	}

	function getScores( revids, start ) {
		var maxScores = 20,
			batchSize = Math.max(1, Math.floor(maxScores / models.length));
		start = start || 0;
		$.ajax( {
			url: oresUrl,
			data: {
				models: models.join( '|' ),
				revids: revids
					.slice( start, start + batchSize )
					.join( '|' )
			},
			dataType: 'json'
		} )
		.done( function ( newScores ) {
			$.extend( scores, newScores[mw.config.get( 'wgDBname' )].scores );
			start = start + batchSize;
			if ( start < revids.length ) {
				$( '#mw-content-text' ).html(
					$( '<p></p>' ).text(
						'Getting scores: ' + ( start / revids.length * 100 ).toFixed( 1 ) + '%'
					)
				);
				getScores( revids, start );
			} else {
				processScores( scores );
			}
		} );
	}

	function getRevIdsFromQuarry() {
		var url = prompt( 'Enter a quarry URL returning the JSON with the revids:', quarryUrl );
		if ( url ) {
			$.getJSON( url ).done( function ( data ) {
				getScores( $.map( data.rows, function ( row ) {
					return row[ 0 ];
				} ) );
			} );
		}
	}

	if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'Blankpage' &&
			mw.config.get( 'wgTitle' ).split( '/' )[ 1 ] === 'TopRevisionsByScore'
	) {
		$.when(
			mw.loader.using( [ 'mediawiki.util', 'jquery.tablesorter' ] ),
			$.ready
		).then( getRevIdsFromQuarry );
	}

}( mediaWiki, jQuery ) );
