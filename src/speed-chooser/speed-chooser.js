'use strict';

/**
 * Source chooser button
 *
 * This feature creates a button to speed media in different levels.
 */

// Translations (English required)
mejs.i18n.en["mejs.speed-chooser"] = "Speed Chooser";

// Feature configuration
Object.assign(mejs.MepDefaults, {
	/**
	 * @type {?String}
	 */
	speedchooserText: null
});

Object.assign(MediaElementPlayer.prototype, {

	/**
	 * Feature constructor.
	 *
	 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
	 * @param {MediaElementPlayer} player
	 * @param {$} controls
	 * @param {$} layers
	 * @param {HTMLElement} media
	 */
	buildspeedchooser (player, controls, layers, media)  {
		this.media = media
		const
			t = this,
			sourceTitle = mejs.Utils.isString(t.options.speedchooserText) ? t.options.speedchooserText : mejs.i18n.t('mejs.speed-chooser'),
			sources = [],
			children = t.mediaFiles ? t.mediaFiles : t.node.childNodes
		;

		// add to list
		let hoverTimeout;

		for (let i = 0, total = children.length; i < total; i++) {
			const s = children[i];

			if (t.mediaFiles) {
				sources.push(s);
			} else if (s.nodeName === 'SOURCE') {
				sources.push(s);
			}
		}

		if (sources.length <= 1) {
			return;
		}

		player.speedchooserButton = document.createElement('div');
		player.speedchooserButton.className = `${t.options.classPrefix}button ${t.options.classPrefix}speedchooser-button`;
		player.speedchooserButton.innerHTML =
			`<button type="button" role="button" aria-haspopup="true" aria-owns="${t.id}" title="${sourceTitle}" aria-label="${sourceTitle}" tabindex="0"></button>` +
			`<div class="${t.options.classPrefix}speedchooser-selector ${t.options.classPrefix}offscreen" role="menu" aria-expanded="false" aria-hidden="true"><ul></ul></div>`;

		t.addControlElement(player.speedchooserButton, 'speedchooser');

		for (let i = 0, total = sources.length; i < total; i++) {
			const src = sources[i];
			if (src.type !== undefined && typeof media.canPlayType === 'function') {
				player.addSourceButton(src.src, src.title, src.type, media.src === src.src, parseInt(src.title.replace(/x/,'').replace(/\./,'').replace(/^2$/,'20')));
			}
		}

		// hover
		player.speedchooserButton.addEventListener('mouseover', () => {
			clearTimeout(hoverTimeout);
			player.showSourcechooserSelector();
		});
		player.speedchooserButton.addEventListener('mouseout', () => {
			hoverTimeout = setTimeout(() => {
				player.hideSourcechooserSelector();
			}, 500);
		});

			// keyboard menu activation
		player.speedchooserButton.addEventListener('keydown', (e) => {

			if (t.options.keyActions.length) {
				const keyCode = e.which || e.keyCode || 0;

				switch (keyCode) {
					case 32: // space
						if (!mejs.MediaFeatures.isFirefox) { // space sends the click event in Firefox
							player.showSourcechooserSelector();
						}
						player.speedchooserButton.querySelector('input[type=radio]:checked').focus();
						break;
					case 13: // enter
						player.showSourcechooserSelector();
						player.speedchooserButton.querySelector('input[type=radio]:checked').focus();
						break;
					case 27: // esc
						player.hideSourcechooserSelector();
						player.speedchooserButton.querySelector('button').focus();
						break;
					default:
						return true;
				}

				e.preventDefault();
				e.stopPropagation();
			}
		});

		// close menu when tabbing away
		player.speedchooserButton.addEventListener('focusout', mejs.Utils.debounce(() => {
			// Safari triggers focusout multiple times
			// Firefox does NOT support e.relatedTarget to see which element
			// just lost focus, so wait to find the next focused element
			setTimeout(() => {
				const parent = document.activeElement.closest(`.${t.options.classPrefix}speedchooser-selector`);
				if (!parent) {
					// focus is outside the control; close menu
					player.hideSourcechooserSelector();
				}
			}, 0);
		}, 100));

		const radios = player.speedchooserButton.querySelectorAll('input[type=radio]');

		for (let i = 0, total = radios.length; i < total; i++) {
			// handle clicks to the source radio buttons
			radios[i].addEventListener('click', function() {
				// set aria states
				this.setAttribute('aria-selected', true);
				this.checked = true;

				const otherRadios = this.closest(`.${t.options.classPrefix}speedchooser-selector`).querySelectorAll('input[type=radio]');
				media.speed = this.dataset.speed

				for (let j = 0, radioTotal = otherRadios.length; j < radioTotal; j++) {
					if (otherRadios[j] !== this) {
						otherRadios[j].setAttribute('aria-selected', 'false');
						otherRadios[j].removeAttribute('checked');
					}
				}

				const src = this.value;

				if (media.getSrc() !== src) {
					let currentTime = media.currentTime;

					const
						paused = media.paused,
						canPlayAfterSourceSwitchHandler = () => {
							if (!paused) {
								media.setCurrentTime(currentTime);
								media.play();
							}
							media.removeEventListener('canplay', canPlayAfterSourceSwitchHandler);
						}
					;

					media.pause();
					media.setSrc(src);
					media.load();
					media.addEventListener('canplay', canPlayAfterSourceSwitchHandler);
				}
			});
		}

		// Handle click so that screen readers can toggle the menu
		player.speedchooserButton.querySelector('button').addEventListener('click', function() {
			if (mejs.Utils.hasClass(mejs.Utils.siblings(this, `.${t.options.classPrefix}speedchooser-selector`), `${t.options.classPrefix}offscreen`)) {
				player.showSourcechooserSelector();
				player.speedchooserButton.querySelector('input[type=radio]:checked').focus();
			} else {
				player.hideSourcechooserSelector();
			}
		});

	},

	/**
	 *
	 * @param {String} src
	 * @param {String} label
	 * @param {String} type
	 * @param {Boolean} isCurrent
	 */
	addSourceButton (src, label, type, isCurrent, speed)  {
		const t = this;
		if (label === '' || label === undefined) {
			label = src;
		}
		type = type.split('/')[1];

		t.speedchooserButton.querySelector('ul').innerHTML += `<li class='${type} speed-${speed}'>` +
			`<input data-speed="${speed}" type="radio" name="${t.id}_speedchooser" id="${t.id}_speedchooser_${label}${type}"` +
				`role="menuitemradio" value="${src}" ${(isCurrent ? 'checked="checked"' : '')} aria-selected="${isCurrent}"/>` +
			`<label for="${t.id}_speedchooser_${label}${type}" aria-hidden="true">${label}</label>` +
		`</li>`;

		t.adjustSourcechooserBox();
	},

	/**
	 *
	 */
	adjustSourcechooserBox ()  {
		const t = this;
		// adjust the size of the outer box
		t.speedchooserButton.querySelector(`.${t.options.classPrefix}speedchooser-selector`).style.height =
			`${parseFloat(t.speedchooserButton.querySelector(`.${t.options.classPrefix}speedchooser-selector ul`).offsetHeight)}px`;
	},

	/**
	 *
	 */
	hideSourcechooserSelector ()  {

		const t = this;

		if (t.speedchooserButton === undefined || !t.speedchooserButton.querySelector('input[type=radio]')) {
			return;
		}

		const
			selector = t.speedchooserButton.querySelector(`.${t.options.classPrefix}speedchooser-selector`),
			radios = selector.querySelectorAll('input[type=radio]')
		;
		selector.setAttribute('aria-expanded', 'false');
		selector.setAttribute('aria-hidden', 'true');
		mejs.Utils.addClass(selector, `${t.options.classPrefix}offscreen`);

		// make radios not focusable
		for (let i = 0, total = radios.length; i < total; i++) {
			radios[i].setAttribute('tabindex', '-1');
		}
	},

	/**
	 *
	 */
	showSourcechooserSelector ()  {

		const t = this;

		if (t.speedchooserButton === undefined || !t.speedchooserButton.querySelector('input[type=radio]')) {
			return;
		}

		const
			selector = t.speedchooserButton.querySelector(`.${t.options.classPrefix}speedchooser-selector`),
			radios = selector.querySelectorAll('input[type=radio]')
		;
		selector.setAttribute('aria-expanded', 'true');
		selector.setAttribute('aria-hidden', 'false');
		mejs.Utils.removeClass(selector, `${t.options.classPrefix}offscreen`);

		// make radios not focusable
		for (let i = 0, total = radios.length; i < total; i++) {
			radios[i].setAttribute('tabindex', '0');
		}
	}
});
