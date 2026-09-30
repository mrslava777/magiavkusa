/* Магия Вкуса — общий скрипт сайта: лоадер, меню, анимации, корзина и оформление заказа */
    (function () {
        'use strict';

        /* ---------- Loader ---------- */
        var loader = document.getElementById('loader');
        window.addEventListener('load', function () {
            setTimeout(function () {
                if (loader) loader.classList.add('hidden');
            }, 500);
        });
        setTimeout(function () {
            if (loader) loader.classList.add('hidden');
        }, 2500);

        /* ---------- Scroll: progress, nav, back-to-top, active link ---------- */
        var progress = document.getElementById('scrollProgress');
        var nav = document.getElementById('nav');
        var backToTop = document.getElementById('backToTop');
        var navLinks = document.querySelectorAll('.nav-links a[data-section]');
        var sections = ['home', 'philosophy', 'collection', 'process', 'testimonials'];

        function onScroll() {
            var doc = document.documentElement;
            var scrollTop = window.pageYOffset || doc.scrollTop;
            var max = doc.scrollHeight - doc.clientHeight;

            if (progress) {
                progress.style.width = (max > 0 ? (scrollTop / max) * 100 : 0) + '%';
            }

            if (nav) nav.classList.toggle('scrolled', scrollTop > 60);
            if (backToTop) backToTop.classList.toggle('visible', scrollTop > 600);

            var current = 'home';
            sections.forEach(function (id) {
                var el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top <= 140) current = id;
            });
            navLinks.forEach(function (a) {
                a.classList.toggle('active', a.getAttribute('data-section') === current);
            });
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        /* ---------- Back to top ---------- */
        if (backToTop) {
            backToTop.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        /* ---------- Mobile menu ---------- */
        var burger = document.getElementById('burger');
        var mobileMenu = document.getElementById('mobileMenu');
        var overlay = document.getElementById('mobileMenuOverlay');

        function setMenu(open) {
            if (burger) burger.classList.toggle('active', open);
            if (mobileMenu) mobileMenu.classList.toggle('active', open);
            if (overlay) overlay.classList.toggle('active', open);
            document.body.classList.toggle('no-scroll', open);
        }

        if (burger) {
            burger.addEventListener('click', function () {
                setMenu(!mobileMenu.classList.contains('active'));
            });
        }
        if (overlay) overlay.addEventListener('click', function () { setMenu(false); });
        document.querySelectorAll('.mobile-menu-links a').forEach(function (a) {
            a.addEventListener('click', function () { setMenu(false); });
        });

        /* ---------- Reveal-анимации ---------- */
        var revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) {
                        e.target.classList.add('visible');
                        io.unobserve(e.target);
                    }
                });
            }, { threshold: 0.15 });
            revealEls.forEach(function (el) { io.observe(el); });
        } else {
            revealEls.forEach(function (el) { el.classList.add('visible'); });
        }

        /* ---------- Счётчики в блоке статистики ---------- */
        var counters = document.querySelectorAll('.stat-number[data-count]');
        function animateCounter(el) {
            var target = parseInt(el.getAttribute('data-count'), 10) || 0;
            var duration = 1600;
            var start = null;
            function step(ts) {
                if (!start) start = ts;
                var p = Math.min((ts - start) / duration, 1);
                var eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(target * eased) + (p === 1 ? '+' : '');
                if (p < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }
        if ('IntersectionObserver' in window && counters.length) {
            var cio = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) {
                        animateCounter(e.target);
                        cio.unobserve(e.target);
                    }
                });
            }, { threshold: 0.5 });
            counters.forEach(function (el) { cio.observe(el); });
        } else {
            counters.forEach(function (el) {
                el.textContent = el.getAttribute('data-count') + '+';
            });
        }


    })();

    /* ============================================================
       КОРЗИНА И ОФОРМЛЕНИЕ ЗАКАЗА
       ------------------------------------------------------------
       Куда уходит заказ, настраивается в ORDER_CONFIG ниже.

       ВАЖНО ПРО БЕЗОПАСНОСТЬ: сайт статический, поэтому любой ключ
       или токен, вписанный сюда, виден в исходнике страницы всем.
       Не храните здесь токены Telegram-ботов и пароли.
       Если нужна автоматическая отправка — укажите endpoint своего
       обработчика на сервере (PHP/Node), он и будет хранить секреты.
       Без endpoint заказ формируется и отправляется вручную:
       копированием текста или через ссылки на мессенджеры.
       ============================================================ */
    (function () {
        'use strict';

        var ORDER_CONFIG = {
            shopName: 'Магия Вкуса',
            currency: ' ₽',
            /* Стоимость доставки. 0 = «уточним при подтверждении» */
            deliveryFee: 0,
            /* Свой обработчик заказа (рекомендуемый вариант): принимает POST с JSON */
            endpoint: '',
            /* Ссылки-мессенджеры: без сервера и без секретов в коде */
            telegram: '',                 /* имя пользователя без @, напр. 'magiya_vkusa' */
            whatsapp: '',                 /* телефон цифрами, напр. '79001234567' */
            email: 'hello@magiya-vkusa.ru'
        };

        var CART_KEY = 'mv_cart_v1';
        var ORDERS_KEY = 'mv_orders_v1';

        function $(id) { return document.getElementById(id); }

        function esc(s) {
            return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
            });
        }

        function money(n) {
            return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ORDER_CONFIG.currency;
        }

        function slug(s) {
            return String(s || '').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-+|-+$/g, '');
        }

        function clean(s) {
            return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
        }

        /* ---------- Карточки каталога читаем прямо из DOM ---------- */
        var CATALOG = {};

        [].forEach.call(document.querySelectorAll('#catalogGrid .dessert-card'), function (card) {
            var nameEl = card.querySelector('.dessert-name');
            if (!nameEl) return;

            var name = clean(nameEl.textContent);
            if (!name) return;

            var priceEl = card.querySelector('.dessert-price');
            var catEl = card.querySelector('.dessert-category');
            var imgEl = card.querySelector('.dessert-image');
            var style = imgEl ? (imgEl.getAttribute('style') || '') : '';
            var match = style.match(/url\(['"]?([^'")]+)['"]?\)/);

            CATALOG[slug(name)] = {
                id: slug(name),
                name: name,
                price: priceEl ? (parseInt(priceEl.textContent.replace(/[^\d]/g, ''), 10) || 0) : 0,
                category: catEl ? clean(catEl.textContent) : '',
                img: match ? match[1] : ''
            };
        });

        /* ---------- Состояние корзины ---------- */
        var cart = readCart();

        function readCart() {
            try {
                var raw = window.localStorage.getItem(CART_KEY);
                var list = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(list)) return [];
                return list.filter(function (i) { return i && i.id && i.qty > 0; });
            } catch (e) { return []; }
        }

        function writeCart() {
            try { window.localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
        }

        function cartCount() {
            return cart.reduce(function (n, i) { return n + i.qty; }, 0);
        }

        function cartSubtotal() {
            return cart.reduce(function (s, i) { return s + i.qty * i.price; }, 0);
        }

        function deliveryFee() {
            if (!cart.length) return 0;
            return ORDER_CONFIG.deliveryFee > 0 ? ORDER_CONFIG.deliveryFee : 0;
        }

        function addToCart(id, qty) {
            var product = CATALOG[id];
            if (!product) return;
            var existing = null;
            [].forEach.call(cart, function (i) { if (i.id === id) existing = i; });

            if (existing) {
                existing.qty += (qty || 1);
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    img: product.img,
                    qty: qty || 1
                });
            }
            writeCart();
            renderCart();
            renderBadges();
            bumpCartButton();
            toast('Добавлено: ' + product.name);
        }

        function setQty(id, delta) {
            for (var i = 0; i < cart.length; i++) {
                if (cart[i].id !== id) continue;
                cart[i].qty += delta;
                if (cart[i].qty < 1) {
                    cart.splice(i, 1);
                    toast('Удалено из корзины');
                }
                break;
            }
            writeCart();
            renderCart();
            renderBadges();
        }

        function removeItem(id) {
            cart = cart.filter(function (i) { return i.id !== id; });
            writeCart();
            renderCart();
            renderBadges();
            toast('Удалено из корзины');
        }

        /* ---------- Отрисовка корзины ---------- */
        function renderCart() {
            var wrap = $('cartItems');
            if (wrap) {
                wrap.innerHTML = cart.map(function (i) {
                    return '<div class="cart-item">' +
                        '<div class="cart-item-img" style="background-image:url(\'' + esc(i.img) + '\')"></div>' +
                        '<div>' +
                            '<div class="cart-item-top">' +
                                '<div>' +
                                    '<div class="cart-item-name">' + esc(i.name) + '</div>' +
                                    '<div class="cart-item-cat">' + esc(i.category) + '</div>' +
                                '</div>' +
                                '<button type="button" class="cart-item-remove" data-remove="' + esc(i.id) + '" aria-label="Удалить">×</button>' +
                            '</div>' +
                            '<div class="cart-item-bottom">' +
                                '<div class="qty">' +
                                    '<button type="button" data-dec="' + esc(i.id) + '" aria-label="Меньше">−</button>' +
                                    '<span>' + i.qty + '</span>' +
                                    '<button type="button" data-inc="' + esc(i.id) + '" aria-label="Больше">+</button>' +
                                '</div>' +
                                '<div class="cart-item-sum">' + money(i.qty * i.price) + '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }

            var has = cart.length > 0;
            if ($('cartEmpty')) $('cartEmpty').style.display = has ? 'none' : 'block';
            if ($('cartFoot')) $('cartFoot').style.display = has ? 'block' : 'none';

            var sub = cartSubtotal();
            var fee = deliveryFee();
            if ($('cartSubtotal')) $('cartSubtotal').textContent = money(sub);
            if ($('cartDelivery')) {
                $('cartDelivery').textContent = !has ? '—' : (fee > 0 ? money(fee) : 'Уточним при подтверждении');
            }
            if ($('cartTotal')) $('cartTotal').textContent = money(sub + fee);
            if ($('cartNote')) {
                $('cartNote').textContent = has
                    ? 'Мы свяжемся с вами, чтобы подтвердить состав, адрес и время.'
                    : '';
            }
            renderOrderSummary();
        }

        function renderOrderSummary() {
            var box = $('orderSummary');
            if (!box) return;
            box.innerHTML = cart.map(function (i) {
                return '<div class="order-summary-line"><span>' + esc(i.name) + ' × ' + i.qty +
                    '</span><span>' + money(i.qty * i.price) + '</span></div>';
            }).join('') +
            '<div class="order-summary-line" style="border-top:1px solid rgba(212,175,122,.25);margin-top:.5rem;padding-top:.5rem">' +
                '<span>Итого</span><span>' + money(cartSubtotal() + deliveryFee()) + '</span>' +
            '</div>';
        }

        function renderBadges() {
            var n = cartCount();
            if ($('navCartCount')) {
                $('navCartCount').textContent = n;
                $('navCartCount').classList.toggle('is-visible', n > 0);
            }
            if ($('mobileCartCount')) $('mobileCartCount').textContent = n;
            if ($('cartBadge')) $('cartBadge').textContent = n;
        }

        function bumpCartButton() {
            var btn = $('navCart');
            if (!btn) return;
            btn.classList.remove('is-bump');
            void btn.offsetWidth;
            btn.classList.add('is-bump');
        }

        function toast(text) {
            var box = $('cartToasts');
            if (!box) return;
            var el = document.createElement('div');
            el.className = 'cart-toast';
            el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
                'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span></span>';
            el.querySelector('span').textContent = text;
            box.appendChild(el);
            window.setTimeout(function () { el.classList.add('is-out'); }, 2200);
            window.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2600);
        }

        /* ---------- Панель корзины ---------- */
        var drawer = $('cartDrawer');
        var overlay = $('cartOverlay');
        var lastFocused = null;

        function showStep(name) {
            [].forEach.call(document.querySelectorAll('.cart-step'), function (step) {
                step.classList.toggle('is-active', step.getAttribute('data-step') === name);
            });
            var scroll = drawer ? drawer.querySelector('.cart-step.is-active .cart-scroll') : null;
            if (scroll) scroll.scrollTop = 0;
        }

        function openCart(step) {
            if (!drawer) return;
            closeMobileMenu();
            lastFocused = document.activeElement;
            if (step === 'form') renderOrderSummary();
            drawer.classList.add('is-open');
            if (overlay) overlay.classList.add('is-open');
            drawer.setAttribute('aria-hidden', 'false');
            document.body.classList.add('no-scroll');
            if ($('cartClose')) $('cartClose').focus();
        }

        function closeCart() {
            if (!drawer) return;
            drawer.classList.remove('is-open');
            if (overlay) overlay.classList.remove('is-open');
            drawer.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('no-scroll');
            if (lastFocused && lastFocused.focus) lastFocused.focus();
        }

        function closeMobileMenu() {
            if ($('mobileMenu')) $('mobileMenu').classList.remove('active');
            if ($('mobileMenuOverlay')) $('mobileMenuOverlay').classList.remove('active');
            if ($('burger')) $('burger').classList.remove('active');
        }

        /* ---------- Оформление заказа ---------- */
        function fieldError(name, on) {
            var field = document.querySelector('.field[data-field="' + name + '"]');
            if (field) field.classList.toggle('has-error', !!on);
        }

        function selectedValue(name) {
            var el = document.querySelector('input[name="' + name + '"]:checked');
            return el ? el.value : '';
        }

        function formatDate(value) {
            var parts = String(value || '').split('-');
            return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : value;
        }

        function validateOrder() {
            var ok = true;
            var first = null;
            var isDelivery = selectedValue('delivery') === 'Доставка';
            var phoneDigits = $('fPhone').value.replace(/\D/g, '');

            if ($('fName').value.trim().length < 2) {
                fieldError('name', true); ok = false; first = first || $('fName');
            } else { fieldError('name', false); }

            if (phoneDigits.length < 10) {
                fieldError('phone', true); ok = false; first = first || $('fPhone');
            } else { fieldError('phone', false); }

            if (isDelivery && $('fAddress').value.trim().length < 5) {
                fieldError('address', true); ok = false; first = first || $('fAddress');
            } else { fieldError('address', false); }

            if (!$('fDate').value) {
                fieldError('date', true); ok = false; first = first || $('fDate');
            } else { fieldError('date', false); }

            if (!$('fTime').value) {
                fieldError('time', true); ok = false; first = first || $('fTime');
            } else { fieldError('time', false); }

            if (!$('fConsent').checked) {
                $('consentError').style.display = 'block';
                ok = false; first = first || $('fConsent');
            } else {
                $('consentError').style.display = 'none';
            }

            if (first && first.focus) first.focus();
            return ok;
        }

        function orderNumber() {
            var d = new Date();
            var pad = function (n) { return (n < 10 ? '0' : '') + n; };
            return 'MV-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
                Math.floor(1000 + Math.random() * 9000);
        }

        function collectOrder() {
            var isDelivery = selectedValue('delivery') === 'Доставка';
            var num = orderNumber();
            var lines = [];

            lines.push('Заказ ' + num + ' — ' + ORDER_CONFIG.shopName);
            lines.push('');
            cart.forEach(function (i, idx) {
                lines.push((idx + 1) + '. ' + i.name + (i.category ? ' (' + i.category + ')' : '') +
                    ' — ' + i.qty + ' × ' + money(i.price) + ' = ' + money(i.qty * i.price));
            });
            lines.push('');
            lines.push('Товары: ' + money(cartSubtotal()));
            var fee = deliveryFee();
            lines.push('Доставка: ' + (fee > 0 ? money(fee) : 'уточним при подтверждении'));
            lines.push('Итого: ' + money(cartSubtotal() + fee));
            lines.push('');
            lines.push('Имя: ' + $('fName').value.trim());
            lines.push('Телефон: ' + $('fPhone').value.trim());
            lines.push('Получение: ' + (isDelivery ? 'Доставка' : 'Самовывоз'));
            if (isDelivery) lines.push('Адрес: ' + $('fAddress').value.trim());
            lines.push('Дата и время: ' + formatDate($('fDate').value) + ', ' + $('fTime').value);
            lines.push('Оплата: ' + selectedValue('payment'));
            var comment = $('fComment').value.trim();
            if (comment) lines.push('Комментарий: ' + comment);

            return {
                number: num,
                text: lines.join('\n'),
                customer: {
                    name: $('fName').value.trim(),
                    phone: $('fPhone').value.trim(),
                    delivery: isDelivery ? 'Доставка' : 'Самовывоз',
                    address: isDelivery ? $('fAddress').value.trim() : '',
                    date: $('fDate').value,
                    time: $('fTime').value,
                    payment: selectedValue('payment'),
                    comment: comment
                },
                items: cart.map(function (i) {
                    return { id: i.id, name: i.name, price: i.price, qty: i.qty };
                }),
                total: cartSubtotal() + fee
            };
        }

        function saveOrder(order) {
            try {
                var list = JSON.parse(window.localStorage.getItem(ORDERS_KEY) || '[]');
                if (!Array.isArray(list)) list = [];
                list.push({ number: order.number, at: new Date().toISOString(), text: order.text });
                window.localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(-50)));
            } catch (e) {}
        }

        function copyText(text, btn) {
            var label = btn.textContent;
            var done = function () {
                btn.textContent = 'Скопировано ✓';
                window.setTimeout(function () { btn.textContent = label; }, 1600);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
            } else {
                fallbackCopy(text);
                done();
            }
        }

        function fallbackCopy(text) {
            var area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.top = '-1000px';
            document.body.appendChild(area);
            area.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(area);
        }

        function showDone(order, failed) {
            if ($('doneNumber')) $('doneNumber').textContent = 'Заказ ' + order.number;
            if ($('doneText')) {
                $('doneText').textContent = failed
                    ? 'Отправить автоматически не получилось. Скопируйте заказ и пришлите его нам в мессенджер — мы подтвердим в течение дня.'
                    : 'Спасибо! Заказ принят. Мы свяжемся с вами, чтобы подтвердить состав, адрес и время.';
            }
            if ($('doneOrderText')) $('doneOrderText').textContent = order.text;

            var actions = $('doneActions');
            if (actions) {
                actions.innerHTML = '';

                var copy = document.createElement('button');
                copy.type = 'button';
                copy.className = 'cart-btn';
                copy.textContent = 'Скопировать заказ';
                copy.addEventListener('click', function () { copyText(order.text, copy); });
                actions.appendChild(copy);

                var link = function (href, label) {
                    var a = document.createElement('a');
                    a.className = 'cart-btn ghost';
                    a.href = href;
                    a.target = '_blank';
                    a.rel = 'noopener';
                    a.textContent = label;
                    a.style.display = 'block';
                    a.style.textAlign = 'center';
                    actions.appendChild(a);
                };

                if (ORDER_CONFIG.telegram) {
                    link('https://t.me/' + encodeURIComponent(ORDER_CONFIG.telegram) +
                        '?text=' + encodeURIComponent(order.text), 'Отправить в Telegram');
                }
                if (ORDER_CONFIG.whatsapp) {
                    link('https://wa.me/' + ORDER_CONFIG.whatsapp +
                        '?text=' + encodeURIComponent(order.text), 'Отправить в WhatsApp');
                }
                if (ORDER_CONFIG.email) {
                    link('mailto:' + ORDER_CONFIG.email +
                        '?subject=' + encodeURIComponent('Заказ ' + order.number) +
                        '&body=' + encodeURIComponent(order.text), 'Отправить на e-mail');
                }
            }

            showStep('done');
            cart = [];
            writeCart();
            renderCart();
            renderBadges();
        }

        /* ---------- Слушатели ---------- */
        [].forEach.call(document.querySelectorAll('[data-add-to-cart]'), function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var card = btn.closest ? btn.closest('.dessert-card') : null;
                var nameEl = card ? card.querySelector('.dessert-name') : null;
                if (!nameEl) return;
                addToCart(slug(clean(nameEl.textContent)), 1);
                btn.classList.add('is-added');
                window.setTimeout(function () { btn.classList.remove('is-added'); }, 900);
            });
        });

        var itemsBox = $('cartItems');
        if (itemsBox) {
            itemsBox.addEventListener('click', function (e) {
                var t = e.target;
                if (!t || !t.closest) return;
                var inc = t.closest('[data-inc]');
                var dec = t.closest('[data-dec]');
                var rem = t.closest('[data-remove]');
                if (inc) setQty(inc.getAttribute('data-inc'), 1);
                else if (dec) setQty(dec.getAttribute('data-dec'), -1);
                else if (rem) removeItem(rem.getAttribute('data-remove'));
            });
        }

        if ($('navCart')) $('navCart').addEventListener('click', function () { openCart('cart'); });
        if ($('mobileCart')) $('mobileCart').addEventListener('click', function () { openCart('cart'); });
        if ($('cartClose')) $('cartClose').addEventListener('click', closeCart);
        if (overlay) overlay.addEventListener('click', closeCart);

        if ($('cartToCatalog')) {
            $('cartToCatalog').addEventListener('click', function () {
                closeCart();
                var target = document.getElementById('collection');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        }

        if ($('cartToForm')) {
            $('cartToForm').addEventListener('click', function () {
                if (!cart.length) { toast('Корзина пуста'); return; }
                renderOrderSummary();
                showStep('form');
            });
        }

        if ($('orderBack')) {
            $('orderBack').addEventListener('click', function () { showStep('cart'); });
        }

        if ($('doneClose')) {
            $('doneClose').addEventListener('click', function () {
                closeCart();
                showStep('cart');
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) closeCart();
        });

        /* Радио-группы: подсветка выбранного */
        ['deliveryGroup', 'paymentGroup'].forEach(function (groupId) {
            var group = $(groupId);
            if (!group) return;
            var sync = function () {
                [].forEach.call(group.querySelectorAll('.radio-chip'), function (chip) {
                    var input = chip.querySelector('input');
                    chip.classList.toggle('is-checked', !!(input && input.checked));
                });
            };
            group.addEventListener('change', sync);
            sync();
        });

        /* Способ получения: адрес нужен только при доставке */
        var deliveryInputs = document.querySelectorAll('input[name="delivery"]');
        [].forEach.call(deliveryInputs, function (input) {
            input.addEventListener('change', function () {
                var isDelivery = selectedValue('delivery') === 'Доставка';
                if ($('addrBlock')) $('addrBlock').classList.toggle('is-active', isDelivery);
                if (isDelivery) return;
                fieldError('address', false);
            });
        });

        /* Дата: не раньше сегодняшнего дня */
        if ($('fDate')) {
            var now = new Date();
            var pad = function (n) { return (n < 10 ? '0' : '') + n; };
            $('fDate').min = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
        }

        /* Отправка формы */
        if ($('orderForm')) {
            $('orderForm').addEventListener('submit', function (e) {
                e.preventDefault();

                if (!cart.length) { showStep('cart'); toast('Корзина пуста'); return; }
                if (!validateOrder()) { toast('Проверьте выделенные поля'); return; }

                var order = collectOrder();
                var btn = $('orderSubmit');

                var unlock = function () {
                    if (btn) { btn.disabled = false; btn.textContent = 'Подтвердить заказ'; }
                };

                saveOrder(order);
                if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }

                if (!ORDER_CONFIG.endpoint) {
                    window.setTimeout(function () { unlock(); showDone(order, false); }, 250);
                    return;
                }

                fetch(ORDER_CONFIG.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(order)
                }).then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    unlock();
                    showDone(order, false);
                }).catch(function () {
                    unlock();
                    showDone(order, true);
                });
            });
        }

        /* ---------- Старт ---------- */
        renderCart();
        renderBadges();
    })();
