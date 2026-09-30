/* Магия Вкуса — логика каталога */
    /* Каталог: разделы, подразделы, фильтр, сортировка, вид, «Показать ещё» */
    (function () {
        'use strict';

        var tilesBox = document.getElementById('catalogTiles');
        if (!tilesBox) return;

        /* ---------- Главная: плитки-превью со ссылками на страницу каталога ---------- */
        if (tilesBox.getAttribute('data-preview') === 'true') {
            var preview = window.MV_PREVIEW || [];
            if (!preview.length) return;

            var out = '';
            for (var k = 0; k < preview.length; k++) {
                var item = preview[k];
                out += '<a class="catalog-tile" href="catalog.html#catalog/' + encodeURIComponent(item.id) + '">' +
                    '<span class="catalog-tile-img" style="background-image:url(\'' + item.img + '\')"></span>' +
                    '<span class="catalog-tile-name">' + item.name + '</span>' +
                    '</a>';
            }
            tilesBox.innerHTML = out;
            tilesBox.style.setProperty('--cols', Math.max(1, Math.min(preview.length, 6)));
            return;
        }

        /* ---------- Каталог: разделы, подразделы, фильтр, сортировка ---------- */
        var catalogGrid = document.getElementById('catalogGrid');
        var catalogCards = catalogGrid ? [].slice.call(catalogGrid.querySelectorAll('.dessert-card')) : [];
        var nothingEl = document.getElementById('catalogNothing');
        var moreEl = document.getElementById('catalogMore');
        var moreBtn = document.getElementById('catalogMoreBtn');
        var tilesBox = document.getElementById('catalogTiles');
        var crumbsBox = document.getElementById('catalogCrumbs');
        var hintEl = document.getElementById('catalogHint');
        var titleEl = document.getElementById('catalogTitle');
        var boardEl = document.getElementById('catalogBoard');
        var filterToggle = document.getElementById('filterToggle');
        var filterPanel = document.getElementById('catalogFilters');
        var filterCount = document.getElementById('filterCount');
        var priceMinEl = document.getElementById('priceMin');
        var priceMaxEl = document.getElementById('priceMax');
        var sortSelect = document.getElementById('sortSelect');
        /* Внешние ссылки на раздел (футер) */
        var jumpLinks = document.querySelectorAll('[data-catalog-section]');

        var PAGE_SIZE = 9;

        var state = {
            section: 'all',
            sub: 'all',
            sort: 'default',
            view: 'grid',
            min: null,
            max: null,
            limit: PAGE_SIZE
        };

        function escHtml(s) {
            return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
            });
        }

        function pluralWord(n, one, few, many) {
            var a = Math.abs(n) % 100;
            var b = a % 10;
            if (a > 10 && a < 20) return many;
            if (b > 1 && b < 5) return few;
            if (b === 1) return one;
            return many;
        }

        function countLabel(n) {
            return n + ' ' + pluralWord(n, 'товар', 'товара', 'товаров');
        }

        function cardImage(card) {
            var imgEl = card ? card.querySelector('.dessert-image') : null;
            var style = imgEl ? (imgEl.getAttribute('style') || '') : '';
            var m = style.match(/url\(['"]?([^'")]+)['"]?\)/);
            return m ? m[1] : '';
        }

        function cardPrice(card) {
            var el = card ? card.querySelector('.dessert-price') : null;
            return el ? (parseInt(el.textContent.replace(/[^\d]/g, ''), 10) || 0) : 0;
        }

        function cardName(card) {
            var el = card ? card.querySelector('.dessert-name') : null;
            return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
        }

        /* Дерево «раздел → подразделы» собираем прямо из карточек:
           названия и счётчики всегда совпадают с содержимым каталога */
        var catalogTree = (function () {
            var order = [], byId = {};

            [].forEach.call(catalogCards, function (card) {
                var secId = card.getAttribute('data-section') || '';
                var subId = card.getAttribute('data-subsection') || '';
                var catEl = card.querySelector('.dessert-category');
                var cat = catEl ? catEl.textContent.replace(/\s+/g, ' ').trim() : '';
                var sep = cat.indexOf('·');
                var secName = sep >= 0 ? cat.slice(0, sep).trim() : cat;
                var subName = sep >= 0 ? cat.slice(sep + 1).trim() : '';
                var img = cardImage(card);

                if (!byId[secId]) {
                    byId[secId] = { id: secId, name: secName, imgs: [], count: 0, subs: [], subById: {} };
                    order.push(byId[secId]);
                }

                var sec = byId[secId];
                sec.count++;
                if (img && sec.imgs.indexOf(img) < 0) sec.imgs.push(img);
                if (!subId) return;

                if (!sec.subById[subId]) {
                    sec.subById[subId] = { id: subId, name: subName, imgs: [], count: 0 };
                    sec.subs.push(sec.subById[subId]);
                }

                var sub = sec.subById[subId];
                sub.count++;
                if (img && sub.imgs.indexOf(img) < 0) sub.imgs.push(img);
            });

            return order;
        })();

        function findSection(id) {
            for (var i = 0; i < catalogTree.length; i++) {
                if (catalogTree[i].id === id) return catalogTree[i];
            }
            return null;
        }

        /* ---------- отбор и порядок товаров ---------- */
        function matchesState(card) {
            var sec = card.getAttribute('data-section') || '';
            var sub = card.getAttribute('data-subsection') || '';
            if (state.section !== 'all' && sec !== state.section) return false;
            if (state.sub !== 'all' && sub !== state.sub) return false;
            var price = cardPrice(card);
            if (state.min !== null && price < state.min) return false;
            if (state.max !== null && price > state.max) return false;
            return true;
        }

        function sortedCards(list) {
            if (state.sort === 'default') return list;
            var arr = list.slice();
            arr.sort(function (a, b) {
                if (state.sort === 'price-asc') return cardPrice(a) - cardPrice(b);
                if (state.sort === 'price-desc') return cardPrice(b) - cardPrice(a);
                var an = cardName(a).toLowerCase();
                var bn = cardName(b).toLowerCase();
                if (state.sort === 'name-asc') return an < bn ? -1 : (an > bn ? 1 : 0);
                return bn < an ? -1 : (bn > an ? 1 : 0);
            });
            return arr;
        }

        /* ---------- плитки разделов и подразделов ---------- */
        var allImages = (function () {
            var list = [];
            [].forEach.call(catalogCards, function (card) {
                var img = cardImage(card);
                if (img && list.indexOf(img) < 0) list.push(img);
            });
            return list;
        })();

        function tileHtml(id, name, img, count, isActive, kind) {
            return '<button type="button" class="catalog-tile' + (isActive ? ' is-active' : '') + '"' +
                ' data-tile-kind="' + kind + '" data-tile-id="' + escHtml(id) + '">' +
                '<span class="catalog-tile-img" style="background-image:url(\'' + escHtml(img) + '\')"></span>' +
                '<span class="catalog-tile-name">' + escHtml(name) + '</span>' +
                '<span class="catalog-tile-count">' + countLabel(count) + '</span>' +
                '</button>';
        }

        function renderTiles(found) {
            if (!tilesBox) return;

            var html = '';
            var cols = 0;
            var section = state.section === 'all' ? null : findSection(state.section);

            /* В одном ряду плитки не должны повторять фото: берём первое свободное */
            var used = {};
            function pick(list) {
                list = list || [];
                for (var i = 0; i < list.length; i++) {
                    if (!used[list[i]]) { used[list[i]] = true; return list[i]; }
                }
                return list[0] || '';
            }

            if (section && section.subs.length) {
                /* Второй уровень: подразделы выбранного раздела.
                   Первая плитка — сам раздел целиком (все его товары) */
                html += tileHtml(section.id, section.name, pick(section.imgs),
                    section.count, state.sub === 'all', 'sub-all');
                [].forEach.call(section.subs, function (sub) {
                    html += tileHtml(sub.id, sub.name, pick(sub.imgs), sub.count, state.sub === sub.id, 'sub');
                });
                cols = section.subs.length + 1;
            } else {
                /* Первый уровень: все разделы */
                html += tileHtml('all', 'Все товары', pick(allImages),
                    catalogCards.length, !section, 'all');
                [].forEach.call(catalogTree, function (s) {
                    html += tileHtml(s.id, s.name, pick(s.imgs), s.count, !!section && s.id === section.id, 'section');
                });
                cols = catalogTree.length + 1;
            }

            tilesBox.innerHTML = html;
            tilesBox.style.setProperty('--cols', Math.max(1, Math.min(cols, 6)));
            renderCrumbs(section, found);
        }

        function renderCrumbs(section, found) {
            var currentSub = null;
            if (section) {
                [].forEach.call(section.subs, function (s) { if (s.id === state.sub) currentSub = s; });
            }

            /* Хлебные крошки и заголовок страницы каталога */
            if (crumbsBox) {
                var parts = ['<a href="index.html">Главная</a>', '<span class="crumb-sep">—</span>'];

                if (!section) {
                    parts.push('<span class="crumb-current">Каталог</span>');
                } else {
                    parts.push('<button type="button" data-crumb="all">Каталог</button>');
                    parts.push('<span class="crumb-sep">—</span>');
                    if (currentSub) {
                        parts.push('<button type="button" data-crumb="section">' + escHtml(section.name) + '</button>');
                        parts.push('<span class="crumb-sep">—</span>');
                        parts.push('<span class="crumb-current">' + escHtml(currentSub.name) + '</span>');
                    } else {
                        parts.push('<span class="crumb-current">' + escHtml(section.name) + '</span>');
                    }
                }
                crumbsBox.innerHTML = parts.join('');
            }

            if (titleEl) {
                titleEl.textContent = currentSub
                    ? currentSub.name
                    : (section ? section.name : 'Каталог');
            }

            if (hintEl) hintEl.textContent = countLabel(found);
        }

        function paintCatalog() {
            var matched = catalogCards.filter(matchesState);
            var ordered = sortedCards(matched);
            var rest = catalogCards.filter(function (card) { return matched.indexOf(card) < 0; });

            /* порядок в сетке: отобранные (в нужном порядке), затем остальные */
            ordered.concat(rest).forEach(function (card) { catalogGrid.appendChild(card); });
            if (nothingEl) catalogGrid.appendChild(nothingEl);

            /* «Показать ещё»: прячем всё, что дальше лимита */
            ordered.forEach(function (card, i) {
                card.classList.toggle('is-hidden', i >= state.limit);
            });
            rest.forEach(function (card) { card.classList.add('is-hidden'); });

            catalogGrid.classList.toggle('is-list', state.view === 'list');

            if (nothingEl) nothingEl.hidden = matched.length > 0;
            if (moreEl) moreEl.hidden = matched.length <= state.limit;

            renderTiles(matched.length);
        }

        function animateTiles() {
            if (!boardEl) return;
            boardEl.classList.remove('is-switching');
            void boardEl.offsetWidth;
            boardEl.classList.add('is-switching');
        }

        /* Адрес раздела — чтобы ссылку на него можно было отправить */
        function syncHash() {
            var hash = '#catalog';
            if (state.section !== 'all') {
                hash += '/' + state.section;
                if (state.sub !== 'all') hash += '/' + state.sub;
            }
            try {
                window.history.replaceState(null, '', window.location.pathname + window.location.search + hash);
            } catch (e) {}
        }

        function readHash() {
            var m = String(window.location.hash || '').match(/^#catalog\/([^/]+)(?:\/([^/]+))?/);
            if (!m) return;
            var section = findSection(decodeURIComponent(m[1]));
            if (!section) return;
            state.section = section.id;
            if (!m[2]) return;
            var sub = decodeURIComponent(m[2]);
            [].forEach.call(section.subs, function (s) { if (s.id === sub) state.sub = sub; });
        }

        function setSection(id) {
            state.section = id || 'all';
            state.sub = 'all';
            state.limit = PAGE_SIZE;
            paintCatalog();
            animateTiles();
            syncHash();
        }

        function setSub(id) {
            state.sub = id || 'all';
            state.limit = PAGE_SIZE;
            paintCatalog();
            animateTiles();
            syncHash();
        }

        function refreshFilterBadge() {
            var n = 0;
            if (state.min !== null) n++;
            if (state.max !== null) n++;
            if (filterCount) {
                filterCount.textContent = n;
                filterCount.hidden = n === 0;
            }
        }

        /* ---------- Слушатели каталога ---------- */
        if (tilesBox) {
            tilesBox.addEventListener('click', function (e) {
                var t = e.target;
                if (!t || !t.closest) return;
                var tile = t.closest('.catalog-tile');
                if (!tile) return;

                var kind = tile.getAttribute('data-tile-kind');
                var id = tile.getAttribute('data-tile-id');

                if (kind === 'sub') setSub(id);
                else if (kind === 'sub-all') setSub('all');
                else setSection(id);
            });
        }

        if (crumbsBox) {
            crumbsBox.addEventListener('click', function (e) {
                var t = e.target;
                if (!t || !t.closest) return;
                var btn = t.closest('[data-crumb]');
                if (!btn) return;
                if (btn.getAttribute('data-crumb') === 'all') setSection('all');
                else setSub('all');
            });
        }

        if (filterToggle && filterPanel) {
            filterToggle.addEventListener('click', function () {
                var open = filterPanel.classList.toggle('is-open');
                filterToggle.classList.toggle('is-active', open);
                filterToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }

        if (document.getElementById('filterApply')) {
            document.getElementById('filterApply').addEventListener('click', function () {
                var mn = priceMinEl && priceMinEl.value !== '' ? Math.max(0, parseInt(priceMinEl.value, 10) || 0) : null;
                var mx = priceMaxEl && priceMaxEl.value !== '' ? Math.max(0, parseInt(priceMaxEl.value, 10) || 0) : null;
                if (mn !== null && mx !== null && mn > mx) {
                    var swap = mn;
                    mn = mx;
                    mx = swap;
                }
                state.min = mn;
                state.max = mx;
                state.limit = PAGE_SIZE;
                paintCatalog();
                refreshFilterBadge();
            });
        }

        if (document.getElementById('filterReset')) {
            document.getElementById('filterReset').addEventListener('click', function () {
                if (priceMinEl) priceMinEl.value = '';
                if (priceMaxEl) priceMaxEl.value = '';
                state.min = null;
                state.max = null;
                state.limit = PAGE_SIZE;
                paintCatalog();
                refreshFilterBadge();
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', function () {
                state.sort = sortSelect.value;
                state.limit = PAGE_SIZE;
                paintCatalog();
            });
        }

        [].forEach.call(document.querySelectorAll('.catalog-view'), function (btn) {
            btn.addEventListener('click', function () {
                state.view = btn.getAttribute('data-view');
                [].forEach.call(document.querySelectorAll('.catalog-view'), function (b) {
                    var on = b === btn;
                    b.classList.toggle('is-active', on);
                    b.setAttribute('aria-pressed', on ? 'true' : 'false');
                });
                paintCatalog();
            });
        });

        if (moreBtn) {
            moreBtn.addEventListener('click', function () {
                state.limit += PAGE_SIZE;
                paintCatalog();
            });
        }

        [].forEach.call(jumpLinks, function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                setSection(link.getAttribute('data-catalog-section'));
                var target = document.getElementById('collection');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        });

        if (catalogCards.length) {
            readHash();
            paintCatalog();
            refreshFilterBadge();
        }
    })();
