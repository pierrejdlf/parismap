var makeTooltips = function(listenedEvent)
{
	var targets = $( '[rel~=tooltip]' ),
		target  = false,
		tooltip = false,
		title   = false;
	var bdecx = 0;
	var bdecy = parseFloat(10);
	
	targets.bind(listenedEvent, function(event) {
		event.stopPropagation();
		// kill all tooltips
		$(".mytooltip").remove();
		targets.attr('tact','off');

		target = $(this);		
		
		var decx = bdecx;
		var decy = bdecy;
		
		var rr = target.attr('r') || 0;
		if(rr!=0) { // SVG
			decx = rr;
			decy += parseFloat(rr);
		} else { // Non-SVG
			decy += parseFloat(2);			
		}
				
		tip	 = target.attr('title');
		var adClass = target.attr('tooltipclass') || '';
		tooltip = $( '<div class="mytooltip '+adClass+'"></div>' );
 
		if(!tip || tip == '') return false;

		tooltip.css( 'opacity', 0 )
			   .html(tip)
			   .appendTo( 'body' );
		
		target.attr('tact','on');
		tooltip.attr('tact','on');
		
		var init_tooltip = function(decx,decy) {		
			if( $( window ).width() < tooltip.outerWidth() * 1.5 ) tooltip.css( 'max-width', $( window ).width()/1.5 );
			else tooltip.css( 'max-width', 340 );
 
			var pos_left = target.offset().left + ( target.outerWidth() / 2 ) - ( tooltip.outerWidth() / 2 ),
				pos_top  = target.offset().top  - ( target.outerWidth() / 2 ) - tooltip.outerHeight() - 20;
 
			if( pos_left < 0 ) {
				pos_left = target.offset().left + target.outerWidth() / 2 - 20;
				tooltip.addClass( 'left' );
			} else tooltip.removeClass( 'left' );
			if( pos_left + tooltip.outerWidth() > $( window ).width() ) {
				pos_left = target.offset().left - tooltip.outerWidth() + target.outerWidth() / 2 + 20;
				tooltip.addClass( 'right' );
			} else tooltip.removeClass( 'right' );
			if( pos_top < 0 ) {
				var pos_top  = target.offset().top + target.outerHeight();
				tooltip.addClass( 'top' );
			} else tooltip.removeClass( 'top' );
			tooltip.css( { left:parseFloat(decx)+parseFloat(pos_left), top:parseFloat(decy)+parseFloat(pos_top), opacity: 1 } );
			//.animate( { top: '+=10', opacity: 1 }, 50 );
		};
 
		init_tooltip(decx,decy);
		
		$(window).resize( function() {init_tooltip(decx,decy);} );
 
		var remove_tooltip = function() {
			if(tooltip.attr('tact')!='on') {
				tooltip.remove();
				//tooltip.animate( { top: '-=10', opacity: 0 }, 50, function() { $( this ).remove(); });
			}
		};
		
		target.bind( 'mouseleave', remove_tooltip );
		tooltip.bind( 'click', function() {
			tooltip.remove();
		});
		tooltip.bind( 'mouseleave', function() {
			tooltip.remove();
		});
	});
};