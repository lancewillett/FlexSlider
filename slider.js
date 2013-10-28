/*
 * Twenty Fourteen Featured Content Slider
 *
 * Adapted from FlexSlider v2.2.0, copyright 2012 WooThemes
 * @link http://www.woothemes.com/flexslider/
 */

( function( $ ) {
	// FeaturedSlider: object instance.
	$.featuredslider = function( el, options ) {
		var slider = $( el );

		// Make variables public.
		slider.vars = $.extend( {}, $.featuredslider.defaults, options );

		var namespace = slider.vars.namespace,
			msGesture = window.navigator && window.navigator.msPointerEnabled && window.MSGesture,
			touch = ( ( 'ontouchstart' in window ) || msGesture || window.DocumentTouch && document instanceof DocumentTouch ),
			eventType = 'click touchend MSPointerUp',
			watchedEvent = '',
			watchedEventClearTimer,
			methods = {},
			focused = true;

		// Store a reference to the slider object.
		$.data( el, 'featuredslider', slider );

		// Private slider methods.
		methods = {
			init: function() {
				slider.animating = false;
				// Get current slide and make sure it is a number.
				slider.currentSlide = parseInt( ( slider.vars.startAt ? slider.vars.startAt : 0 ), 10 );
				if ( isNaN( slider.currentSlide ) )
					slider.currentSlide = 0;
				slider.animatingTo = slider.currentSlide;
				slider.atEnd = ( slider.currentSlide === 0 || slider.currentSlide === slider.last );
				slider.containerSelector = slider.vars.selector.substr( 0, slider.vars.selector.search( ' ' ) );
				slider.slides = $( slider.vars.selector, slider );
				slider.container = $( slider.containerSelector, slider );
				slider.count = slider.slides.length;
				slider.prop = 'marginLeft';
				slider.args = {};
				// SLIDESHOW
				slider.manualPause = false;
				slider.stopped = false;
				// PAUSE WHEN INVISIBLE
				slider.started = false;
				slider.startTimeout = null;
				// TOUCH
				slider.transitions = ( function() {
					var obj = document.createElement( 'div' ),
						props = ['perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective'];
					for ( var i in props ) {
						if ( obj.style[ props[i] ] !== undefined ) {
							slider.pfx = props[i].replace( 'Perspective', '' ).toLowerCase();
							slider.prop = '-' + slider.pfx + '-transform';
							return true;
						}
					}
					return false;
				}() );
				// CONTROLSCONTAINER
				if ( slider.vars.controlsContainer !== '' )
					slider.controlsContainer = $( slider.vars.controlsContainer ).length > 0 && $( slider.vars.controlsContainer );

				// RANDOMIZE
				if ( slider.vars.randomize ) {
					slider.slides.sort( function() { return ( Math.round( Math.random() ) - 0.5 ); } );
					slider.container.empty().append( slider.slides );
				}

				slider.doMath();

				// INIT
				slider.setup( 'init' );

				// CONTROLNAV
				methods.controlNav.setup();

				// DIRECTIONNAV
				methods.directionNav.setup();

				// PAUSE WHEN INVISIBLE
				if ( slider.vars.slideshow && slider.vars.pauseInvisible )
					methods.pauseInvisible.init();

				// SLIDSESHOW
				if ( slider.vars.slideshow ) {
					// Initialize animation
					//If we're visible, or we don't use PageVisibility API
					if ( ! slider.vars.pauseInvisible || ! methods.pauseInvisible.isHidden() ) {
						( slider.vars.initDelay > 0 ) ? slider.startTimeout = setTimeout( slider.play, slider.vars.initDelay ) : slider.play();
					}
				}

				// ASNAV
				if ( asNav )
					methods.asNav.setup();

				// TOUCH
				methods.touch();

				// SLIDE
				$( window ).bind( 'resize orientationchange focus', methods.resize );

				slider.find( 'img' ).attr( 'draggable', 'false' );
			},
			asNav: {
				setup: function() {
					slider.asNav = true;
					slider.animatingTo = Math.floor( slider.currentSlide );
					slider.currentItem = slider.currentSlide;
					slider.slides.removeClass( namespace + 'active-slide' ).eq( slider.currentItem ).addClass( namespace + 'active-slide' );
					if ( ! msGesture ) {
						slider.slides.click( function( e ) {
							e.preventDefault();
							var $slide = $( this ),
									target = $slide.index();
							var posFromLeft = $slide.offset().left - $( slider ).scrollLeft(); // Find position of slide relative to left of slider container
							if ( posFromLeft <= 0 && $slide.hasClass( namespace + 'active-slide' ) ) {
								slider.featureAnimate( slider.getTarget( 'prev' ), true );
							} else if ( ! $slide.hasClass( namespace + 'active-slide' ) ) {
								slider.direction = ( slider.currentItem < target ) ? 'next' : 'prev';
								slider.featureAnimate( target, false, true, true );
							}
						} );
					} else {
						el._slider = slider;
						slider.slides.each( function () {
							var that = this;
							that._gesture = new MSGesture();
							that._gesture.target = that;
							that.addEventListener( 'MSPointerDown', function ( e ) {
								e.preventDefault();
								if ( e.currentTarget._gesture )
									e.currentTarget._gesture.addPointer( e.pointerId );
							}, false );
							that.addEventListener( 'MSGestureTap', function ( e ) {
								e.preventDefault();
								var $slide = $( this ),
									target = $slide.index();
								if ( ! $slide.hasClass( 'active' ) ) {
									slider.direction = ( slider.currentItem < target ) ? 'next' : 'prev';
									slider.featureAnimate( target, false, true, true );
								}
							} );
						} );
					}
				}
			},
			controlNav: {
				setup: function() {
					methods.controlNav.setupPaging();
				},
				setupPaging: function() {
					var type = 'control-paging',
						j = 1,
						item,
						slide;

					slider.controlNavScaffold = $( '<ol class="' + namespace + 'control-nav ' + namespace + type + '"></ol>' );

					if ( slider.pagingCount > 1 ) {
						for ( var i = 0; i < slider.pagingCount; i++ ) {
							slide = slider.slides.eq( i );
							item = '<a>' + j + '</a>';
							slider.controlNavScaffold.append( '<li>' + item + '</li>' );
							j++;
						}
					}

					// CONTROLSCONTAINER:
					( slider.controlsContainer ) ? $( slider.controlsContainer ).append( slider.controlNavScaffold ) : slider.append( slider.controlNavScaffold );
					methods.controlNav.set();

					methods.controlNav.active();

					slider.controlNavScaffold.delegate( 'a, img', eventType, function( event ) {
						event.preventDefault();

						if ( watchedEvent === '' || watchedEvent === event.type ) {
							var $this = $( this ),
								target = slider.controlNav.index( $this );

							if ( ! $this.hasClass( namespace + 'active' ) ) {
								slider.direction = ( target > slider.currentSlide ) ? 'next' : 'prev';
								slider.featureAnimate( target );
							}
						}

						// Set up flags to prevent event duplication
						if ( watchedEvent === '' )
							watchedEvent = event.type;

						methods.setToClearWatchedEvent();
					} );
				},
				set: function() {
					var selector = 'a';
					slider.controlNav = $( '.' + namespace + 'control-nav li ' + selector, ( slider.controlsContainer ) ? slider.controlsContainer : slider );
				},
				active: function() {
					slider.controlNav.removeClass( namespace + 'active' ).eq( slider.animatingTo ).addClass( namespace + 'active' );
				},
				update: function( action, pos ) {
					if ( slider.pagingCount > 1 && action === 'add' ) {
						slider.controlNavScaffold.append( $( '<li><a>' + slider.count + '</a></li>' ) );
					} else if ( slider.pagingCount === 1 ) {
						slider.controlNavScaffold.find( 'li' ).remove();
					} else {
						slider.controlNav.eq( pos ).closest( 'li' ).remove();
					}
					methods.controlNav.set();
					( slider.pagingCount > 1 && slider.pagingCount !== slider.controlNav.length ) ? slider.update( pos, action ) : methods.controlNav.active();
				}
			},
			directionNav: {
				setup: function() {
					var directionNavScaffold = $( '<ul class="' + namespace + 'direction-nav"><li><a class="' + namespace + 'prev" href="#">' + slider.vars.prevText + '</a></li><li><a class="' + namespace + 'next" href="#">' + slider.vars.nextText + '</a></li></ul>' );

					// CONTROLSCONTAINER:
					if ( slider.controlsContainer ) {
						$( slider.controlsContainer ).append( directionNavScaffold );
						slider.directionNav = $( '.' + namespace + 'direction-nav li a', slider.controlsContainer );
					} else {
						slider.append( directionNavScaffold );
						slider.directionNav = $( '.' + namespace + 'direction-nav li a', slider );
					}

					methods.directionNav.update();

					slider.directionNav.bind( eventType, function( event ) {
						event.preventDefault();
						var target;

						if ( watchedEvent === '' || watchedEvent === event.type ) {
							target = ( $( this ).hasClass( namespace + 'next' ) ) ? slider.getTarget( 'next' ) : slider.getTarget( 'prev' );
							slider.featureAnimate( target );
						}

						// Set up flags to prevent event duplication
						if ( watchedEvent === '' )
							watchedEvent = event.type;

						methods.setToClearWatchedEvent();
					} );
				},
				update: function() {
					var disabledClass = namespace + 'disabled';
					if ( slider.pagingCount === 1 ) {
						slider.directionNav.addClass( disabledClass ).attr( 'tabindex', '-1' );
					} else {
						slider.directionNav.removeClass( disabledClass ).removeAttr( 'tabindex' );
					}
				}
			},
			touch: function() {
				var startX,
					startY,
					offset,
					cwidth,
					dx,
					startT,
					scrolling = false,
					localX = 0,
					localY = 0,
					accDx = 0;

				if ( ! msGesture ) {
					el.addEventListener( 'touchstart', onTouchStart, false );

					function onTouchStart( e ) {
						if ( slider.animating ) {
							e.preventDefault();
						} else if ( ( window.navigator.msPointerEnabled ) || e.touches.length === 1 ) {
							slider.pause();
							cwidth = slider.w;
							startT = Number( new Date() );

							// Local vars for X and Y points.
							localX = e.touches[0].pageX;
							localY = e.touches[0].pageY;

							offset = ( slider.animatingTo === slider.last ) ? 0 :
									 ( slider.currentSlide === slider.last ) ? slider.limit : ( slider.currentSlide + slider.cloneOffset ) * cwidth;
							startX = localX;
							startY = localY;

							el.addEventListener( 'touchmove', onTouchMove, false );
							el.addEventListener( 'touchend', onTouchEnd, false );
						}
					}

					function onTouchMove( e ) {
						// Local vars for X and Y points.

						localX = e.touches[0].pageX;
						localY = e.touches[0].pageY;

						dx = startX - localX;
						scrolling = Math.abs( dx ) < Math.abs( localY - startY );

						var fxms = 500;

						if ( ! scrolling || Number( new Date() ) - startT > fxms ) {
							e.preventDefault();
							if ( slider.transitions ) {
								slider.setProps( offset + dx, 'setTouch' );
							}
						}
					}

					function onTouchEnd( e ) {
						// Finish the touch by undoing the touch session
						el.removeEventListener( 'touchmove', onTouchMove, false );

						if ( slider.animatingTo === slider.currentSlide && ! scrolling && ! ( dx === null ) ) {
							var updateDx = dx,
								target = ( updateDx > 0 ) ? slider.getTarget( 'next' ) : slider.getTarget( 'prev' );

							if ( slider.canAdvance( target ) && ( Number( new Date() ) - startT < 550 && Math.abs( updateDx ) > 50 || Math.abs( updateDx ) > cwidth / 2 ) ) {
								slider.featureAnimate( target );
							}
						}
						el.removeEventListener( 'touchend', onTouchEnd, false );

						startX = null;
						startY = null;
						dx = null;
						offset = null;
					}
				} else {
					el.style.msTouchAction = 'none';
					el._gesture = new MSGesture();
					el._gesture.target = el;
					el.addEventListener( 'MSPointerDown', onMSPointerDown, false );
					el._slider = slider;
					el.addEventListener( 'MSGestureChange', onMSGestureChange, false );
					el.addEventListener( 'MSGestureEnd', onMSGestureEnd, false );

					function onMSPointerDown( e ) {
						e.stopPropagation();
						if ( slider.animating ) {
							e.preventDefault();
						} else {
							slider.pause();
							el._gesture.addPointer( e.pointerId );
							accDx = 0;
							cwidth = slider.w;
							startT = Number( new Date() );
							offset = ( slider.animatingTo === slider.last ) ? 0 :
									( slider.currentSlide === slider.last ) ? slider.limit : ( slider.currentSlide + slider.cloneOffset ) * cwidth;
						}
					}

					function onMSGestureChange( e ) {
						e.stopPropagation();
						var slider = e.target._slider;
						if ( ! slider )
							return;

						var transX = -e.translationX,
							transY = -e.translationY;

						// Accumulate translations.
						accDx = accDx + transX;
						dx = accDx;
						scrolling = Math.abs( accDx ) < Math.abs( -transY );

						if ( e.detail === e.MSGESTURE_FLAG_INERTIA ) {
							setImmediate( function () {
								el._gesture.stop();
							} );

							return;
						}

						if ( ! scrolling || Number( new Date() ) - startT > 500 ) {
							e.preventDefault();
							if ( slider.transitions ) {
								slider.setProps( offset + dx, 'setTouch' );
							}
						}
					}

					function onMSGestureEnd( e ) {
						e.stopPropagation();
						var slider = e.target._slider;
						if ( ! slider )
							return;

						if ( slider.animatingTo === slider.currentSlide && ! scrolling && ! ( dx === null ) ) {
							var updateDx = dx,
								target = ( updateDx > 0 ) ? slider.getTarget( 'next' ) : slider.getTarget( 'prev' );

							if ( slider.canAdvance( target ) && ( Number( new Date() ) - startT < 550 && Math.abs( updateDx ) > 50 || Math.abs( updateDx ) > cwidth / 2 ) ) {
								slider.featureAnimate( target );
							}
						}

						startX = null;
						startY = null;
						dx = null;
						offset = null;
						accDx = 0;
					}
				}
			},
			resize: function() {
				if ( ! slider.animating && slider.is( ':visible' ) ) {
					slider.doMath();

					// SMOOTH HEIGHT
					methods.smoothHeight();
					slider.newSlides.width( slider.computedW );
					slider.setProps( slider.computedW, 'setTotal' );
				}
			},
			smoothHeight: function( dur ) {
				var $obj = slider.viewport;
				( dur ) ? $obj.animate( {'height': slider.slides.eq( slider.animatingTo ).height()}, dur ) : $obj.height( slider.slides.eq( slider.animatingTo ).height() );
			},
			setToClearWatchedEvent: function() {
				clearTimeout( watchedEventClearTimer );
				watchedEventClearTimer = setTimeout( function() {
					watchedEvent = '';
				}, 3000 );
			}
		};

		// Public methods
		slider.featureAnimate = function( target, override ) {
			if ( target !== slider.currentSlide )
				slider.direction = ( target > slider.currentSlide ) ? 'next' : 'prev';

			if ( asNav && slider.pagingCount === 1 )
				slider.direction = ( slider.currentItem < target ) ? 'next' : 'prev';

			if ( ! slider.animating && ( slider.canAdvance( target, fromNav ) || override ) && slider.is( ':visible' ) ) {
				slider.animating = true;
				slider.animatingTo = target;

				// SLIDESHOW
				if ( pause )
					slider.pause();

				// CONTROLNAV
				methods.controlNav.active();

				slider.slides.removeClass( namespace + 'active-slide' ).eq( target ).addClass( namespace + 'active-slide' );

				slider.atEnd = target === 0 || target === slider.last;

				// DIRECTIONNAV
				methods.directionNav.update();

				if ( target === slider.last ) {
					// SLIDESHOW
					slider.pause();
				}

				// SLIDE
				var dimension = slider.computedW,
					margin, slideString, calcNext;

				if ( slider.currentSlide === 0 && target === slider.count - 1 && slider.direction !== 'next' ) {
					slideString = 0;
				} else if ( slider.currentSlide === slider.last && target === 0 && slider.direction !== 'prev' ) {
					slideString = ( slider.count + 1 ) * dimension;
				} else {
					slideString = ( target + slider.cloneOffset ) * dimension;
				}
				slider.setProps( slideString, '', slider.vars.animationSpeed );
				if ( slider.transitions ) {
					if ( ! slider.atEnd ) {
						slider.animating = false;
						slider.currentSlide = slider.animatingTo;
					}
					slider.container.unbind( 'webkitTransitionEnd transitionend' );
					slider.container.bind( 'webkitTransitionEnd transitionend', function() {
						slider.wrapup( dimension );
					} );
				} else {
					slider.container.animate( slider.args, slider.vars.animationSpeed, 'swing', function() {
						slider.wrapup( dimension );
					} );
				}

				// SMOOTH HEIGHT
				methods.smoothHeight( slider.vars.animationSpeed );
			}
		};
		slider.wrapup = function( dimension ) {
			// SLIDE
			if ( slider.currentSlide === 0 && slider.animatingTo === slider.last ) {
				slider.setProps( dimension, 'jumpEnd' );
			} else if ( slider.currentSlide === slider.last && slider.animatingTo === 0 ) {
				slider.setProps( dimension, 'jumpStart' );
			}
			slider.animating = false;
			slider.currentSlide = slider.animatingTo;
		};

		// SLIDESHOW
		slider.animateSlides = function() {
			if ( ! slider.animating && focused )
				slider.featureAnimate( slider.getTarget( 'next' ) );
		};
		// SLIDESHOW
		slider.pause = function() {
			clearInterval( slider.animatedSlides );
			slider.animatedSlides = null;
			slider.playing = false;
		};
		// SLIDESHOW
		slider.play = function() {
			if ( slider.playing )
				clearInterval( slider.animatedSlides );
			slider.animatedSlides = slider.animatedSlides || setInterval( slider.animateSlides, slider.vars.slideshowSpeed );
			slider.started = slider.playing = true;
		};
		// STOP:
		slider.stop = function () {
			slider.pause();
			slider.stopped = true;
		};
		slider.canAdvance = function( target, fromNav ) {
			// ASNAV
			var last = ( asNav ) ? slider.pagingCount - 1 : slider.last;
			return ( fromNav ) ? true :
				( asNav && slider.currentItem === slider.count - 1 && target === 0 && slider.direction === 'prev' ) ? true :
				( asNav && slider.currentItem === 0 && target === slider.pagingCount - 1 && slider.direction !== 'next' ) ? false :
				( target === slider.currentSlide && ! asNav ) ? false :
				( slider.atEnd && slider.currentSlide === 0 && target === last && slider.direction !== 'next' ) ? false :
				( slider.atEnd && slider.currentSlide === last && target === 0 && slider.direction === 'next' ) ? false :
				true;
		};
		slider.getTarget = function( dir ) {
			slider.direction = dir;
			if ( dir === 'next' ) {
				return ( slider.currentSlide === slider.last ) ? 0 : slider.currentSlide + 1;
			} else {
				return ( slider.currentSlide === 0 ) ? slider.last : slider.currentSlide - 1;
			}
		};

		// SLIDE
		slider.setProps = function( pos, special, dur ) {
			var target = ( function() {
				var posCheck = ( pos ) ? pos : slider.itemW * slider.animatingTo,
					posCalc = ( function() {
						switch ( special ) {
							case 'setTotal': return ( slider.currentSlide + slider.cloneOffset ) * pos;
							case 'setTouch': return pos;
							case 'jumpEnd': return slider.count * pos;
							case 'jumpStart': return pos;
							default: return pos;
						}
					}() );
				return ( posCalc * -1 ) + 'px';
			}() );

			if ( slider.transitions ) {
				target = 'translate3d( ' + target + ',0,0 )';
				dur = ( dur !== undefined ) ? ( dur/1000 ) + 's' : '0s';
				slider.container.css( '-' + slider.pfx + '-transition-duration', dur );
			}

			slider.args[slider.prop] = target;
			if ( slider.transitions || dur === undefined )
				slider.container.css( slider.args );
		};

		slider.setup = function( type ) {
			// SLIDE
			var sliderOffset, arr;

			if ( type === 'init' ) {
				slider.viewport = $( '<div class="' + namespace + 'viewport"></div>' ).css( {'overflow': 'hidden', 'position': 'relative'} ).appendTo( slider ).append( slider.container );
				slider.cloneCount = 0;
				slider.cloneOffset = 0;
			}
			slider.cloneCount = 2;
			slider.cloneOffset = 1;
			// Clear out old clones
			if ( type !== 'init' )	
				slider.container.find( '.clone' ).remove();

			slider.container.append( slider.slides.first().clone().addClass( 'clone' ).attr( 'aria-hidden', 'true' ) ).prepend( slider.slides.last().clone().addClass( 'clone' ).attr( 'aria-hidden', 'true' ) );

			slider.newSlides = $( slider.vars.selector, slider );

			sliderOffset = slider.currentSlide + slider.cloneOffset;
			slider.container.width( ( slider.count + slider.cloneCount ) * 200 + '%' );
			slider.setProps( sliderOffset * slider.computedW, 'init' );
			setTimeout( function() {
				slider.doMath();
				slider.newSlides.css( {'width': slider.computedW, 'float': 'left', 'display': 'block'} );
				// SMOOTH HEIGHT
				methods.smoothHeight();
			}, ( type === 'init' ) ? 100 : 0 );

			slider.slides.removeClass( namespace + 'active-slide' ).eq( slider.currentSlide ).addClass( namespace + 'active-slide' );
		};

		slider.doMath = function() {
			var slide = slider.slides.first();

			slider.w = ( slider.viewport===undefined ) ? slider.width() : slider.viewport.width();
			slider.h = slide.height();
			slider.boxPadding = slide.outerWidth() - slide.width();

			slider.itemW = slider.w;
			slider.pagingCount = slider.count;
			slider.last = slider.count - 1;
			slider.computedW = slider.itemW - slider.boxPadding;
		};

		slider.update = function( pos, action ) {
			slider.doMath();

			// Update currentSlide and slider.animatingTo if necessary
			if ( pos < slider.currentSlide ) {
				slider.currentSlide += 1;
			} else if ( pos <= slider.currentSlide && pos !== 0 ) {
				slider.currentSlide -= 1;
			}
			slider.animatingTo = slider.currentSlide;

			// Update controlNav
			if ( ( action === 'add' ) || slider.pagingCount > slider.controlNav.length ) {
				methods.controlNav.update( 'add' );
			} else if ( action === 'remove' || slider.pagingCount < slider.controlNav.length ) {
				if ( slider.currentSlide > slider.last ) {
					slider.currentSlide -= 1;
					slider.animatingTo -= 1;
				}
				methods.controlNav.update( 'remove', slider.last );
			}
			// Update directionNav
			methods.directionNav.update();
		};

		slider.addSlide = function( obj, pos ) {
			var $obj = $( obj );

			slider.count += 1;
			slider.last = slider.count - 1;

			// Append new slide.
			if ( pos !== undefined )
				slider.slides.eq( pos ).before( $obj );
			else
				slider.container.append( $obj );

			// Update currentSlide, animatingTo, controlNav, and directionNav.
			slider.update( pos, 'add' );

			// Update slider.slides.
			slider.slides = $( slider.vars.selector + ':not(.clone )', slider );
			// Le-setup the slider to accomdate new slide
			slider.setup();
		};
		slider.removeSlide = function( obj ) {
			var pos = ( isNaN( obj ) ) ? slider.slides.index( $( obj ) ) : obj;

			// Update count.
			slider.count -= 1;
			slider.last = slider.count - 1;

			// Remove slide.
			if ( isNaN( obj ) ) {
				$( obj, slider.slides ).remove();
			} else {
				slider.slides.eq( obj ).remove();
			}

			// Update currentSlide, animatingTo, controlNav, and directionNav.
			slider.doMath();
			slider.update( pos, 'remove' );

			// Update slider.slides.
			slider.slides = $( slider.vars.selector + ':not(.clone )', slider );
			// Re-setup the slider to accomdate new slide.
			slider.setup();
		};

		// FeaturedSlider: Initialize
		methods.init();
	};

	// Ensure the slider isn't focussed if the window loses focus.
	$( window ).blur( function ( e ) {
		focused = false;
	} ).focus( function ( e ) {
		focused = true;
	} );

	// FeaturedSlider: Default Settings
	$.featuredslider.defaults = {
		namespace: 'slider',             // {NEW} String: Prefix string attached to the class of every element generated by the plugin
		selector: '.slides > li',       // {NEW} Selector: Must match a simple pattern. '{container} > {slide}' -- Ignore pattern at your own peril
		controlsContainer: '',          // {UPDATED} jQuery Object/Selector: Declare which container the navigation elements should be appended too. Default container is the FeaturedSlider element. Example use would be $( '.featuredslider-container' ). Property is ignored if given element is not found.
		animationSpeed: 600,            // Integer: Set the speed of animations, in milliseconds

		// Text labels: @todo allow translation
		prevText: 'Previous',     // String: Set the text for the "previous" directionNav item.
		nextText: 'Next'          // String: Set the text for the "next" directionNav item.
	};

	// FeaturedSlider: Plugin Function
	$.fn.featuredslider = function( options ) {
		if ( options === undefined )
			options = {};

		if ( typeof options === 'object' ) {
			return this.each( function() {
				var $this = $( this ),
					selector = ( options.selector ) ? options.selector : '.slides > li',
					$slides = $this.find( selector );

			if ( $slides.length === 1 || $slides.length === 0 ) {
					$slides.fadeIn( 400 );
					if ( options.start )
						options.start( $this );
				} else if ( $this.data( 'featuredslider' ) === undefined ) {
					new $.featuredslider( this, options );
				}
			} );
		}
	};
} )( jQuery );
