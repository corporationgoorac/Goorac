class EmojiPicker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.skinTone = localStorage.getItem('goorac_skin_tone') || '';
        this.recentEmojis = JSON.parse(localStorage.getItem('goorac_recents')) || [];
        this.emojiData = this.getEmojiData();
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
        this.loadEmojis('all'); // Load all initially
    }

    getEmojiData() {
        // A curated list of popular emojis with keywords for search
        return [
            { id: 'smileys', name: 'Smileys & People', icon: '😀', emojis: [
                {c:'😀', k:'smile happy'}, {c:'😃', k:'smile happy open'}, {c:'😄', k:'smile happy eye'}, 
                {c:'😁', k:'grin'}, {c:'😆', k:'laugh'}, {c:'😅', k:'sweat smile'}, 
                {c:'🤣', k:'rofl'}, {c:'😂', k:'joy cry'}, {c:'🙂', k:'slight smile'}, 
                {c:'😉', k:'wink'}, {c:'😊', k:'blush'}, {c:'😇', k:'halo'}, 
                {c:'🥰', k:'love hearts'}, {c:'😍', k:'heart eyes'}, {c:'🤩', k:'star eyes'}, 
                {c:'😘', k:'kiss'}, {c:'😗', k:'kiss'}, {c:'😚', k:'kiss closed'}, 
                {c:'😙', k:'kiss smile'}, {c:'😋', k:'yum'}, {c:'😛', k:'tongue'}, 
                {c:'😜', k:'wink tongue'}, {c:'🤪', k:'zany'}, {c:'😝', k:'squint tongue'}, 
                {c:'🤑', k:'money'}, {c:'🤗', k:'hugs'}, {c:'🤭', k:'hand mouth'}, 
                {c:'🤫', k:'shh'}, {c:'🤔', k:'think'}, {c:'🤐', k:'zipper'}, 
                {c:'🤨', k:'raised eyebrow'}, {c:'😐', k:'neutral'}, {c:'😑', k:'expressionless'}, 
                {c:'😶', k:'no mouth'}, {c:'😏', k:'smirk'}, {c:'😒', k:'unamused'}, 
                {c:'🙄', k:'roll eyes'}, {c:'😬', k:'grimace'}, {c:'🤥', k:'lying'}, 
                {c:'😌', k:'relieved'}, {c:'😔', k:'pensive'}, {c:'😪', k:'sleepy'}, 
                {c:'🤤', k:'drool'}, {c:'😴', k:'sleep'}, {c:'😷', k:'mask medical'}, 
                {c:'🤒', k:'thermometer'}, {c:'🤕', k:'bandage'}, {c:'🤢', k:'nauseated'}, 
                {c:'🤮', k:'vomit'}, {c:'🤧', k:'sneeze'}, {c:'🥵', k:'hot'}, 
                {c:'🥶', k:'cold'}, {c:'🥴', k:'woozy'}, {c:'😵', k:'dizzy'}, 
                {c:'🤯', k:'explode'}, {c:'🤠', k:'cowboy'}, {c:'🥳', k:'party'}, 
                {c:'😎', k:'sunglasses'}, {c:'🤓', k:'nerd'}, {c:'🧐', k:'monocle'}, 
                {c:'😕', k:'confused'}, {c:'😟', k:'worried'}, {c:'🙁', k:'frown'}, 
                {c:'😮', k:'open mouth'}, {c:'😯', k:'hushed'}, {c:'😲', k:'astonished'}, 
                {c:'😳', k:'flushed'}, {c:'🥺', k:'pleading'}, {c:'😦', k:'frowning'}, 
                {c:'😧', k:'anguished'}, {c:'😨', k:'fearful'}, {c:'😰', k:'cold sweat'}, 
                {c:'😥', k:'disappointed'}, {c:'😢', k:'cry'}, {c:'😭', k:'sob'}, 
                {c:'😱', k:'scream'}, {c:'😖', k:'confounded'}, {c:'😣', k:'persevering'}, 
                {c:'😞', k:'disappointed'}, {c:'😓', k:'sweat'}, {c:'😩', k:'weary'}, 
                {c:'😫', k:'tired'}, {c:'🥱', k:'yawn'}, {c:'😤', k:'triumph'}, 
                {c:'😡', k:'pout'}, {c:'😠', k:'angry'}, {c:'🤬', k:'cursing'}, 
                {c:'😈', k:'devil smile'}, {c:'👿', k:'devil angry'}, {c:'💀', k:'skull'}, 
                {c:'☠️', k:'skull bones'}, {c:'💩', k:'poop'}, {c:'🤡', k:'clown'}, 
                {c:'👹', k:'ogre'}, {c:'👺', k:'goblin'}, {c:'👻', k:'ghost'}, 
                {c:'👽', k:'alien'}, {c:'👾', k:'monster'}, {c:'🤖', k:'robot'},
                {c:'👋', k:'wave hand', s:true}, {c:'🤚', k:'back hand', s:true}, {c:'🖐️', k:'fingers splayed', s:true},
                {c:'✋', k:'hand', s:true}, {c:'🖖', k:'vulcan', s:true}, {c:'👌', k:'ok', s:true},
                {c:'🤌', k:'pinched fingers', s:true}, {c:'🤏', k:'pinching hand', s:true}, {c:'✌️', k:'victory', s:true},
                {c:'🤞', k:'fingers crossed', s:true}, {c:'🤟', k:'love you', s:true}, {c:'🤘', k:'rock', s:true},
                {c:'🤙', k:'call me', s:true}, {c:'👈', k:'point left', s:true}, {c:'👉', k:'point right', s:true},
                {c:'👆', k:'point up', s:true}, {c:'🖕', k:'middle finger', s:true}, {c:'👇', k:'point down', s:true},
                {c:'👍', k:'thumbs up', s:true}, {c:'👎', k:'thumbs down', s:true}, {c:'✊', k:'fist', s:true},
                {c:'👊', k:'fist bump', s:true}, {c:'👏', k:'clap', s:true}, {c:'🙌', k:'hands up', s:true},
                {c:'👐', k:'open hands', s:true}, {c:'🤲', k:'palms up', s:true}, {c:'🤝', k:'handshake', s:true},
                {c:'🙏', k:'pray', s:true}, {c:'✍️', k:'write', s:true}, {c:'💅', k:'nail polish', s:true},
                {c:'🤳', k:'selfie', s:true}, {c:'💪', k:'muscle', s:true}
            ]},
            { id: 'nature', name: 'Nature & Animals', icon: '🐻', emojis: [
                {c:'🐶', k:'dog'}, {c:'🐱', k:'cat'}, {c:'🐭', k:'mouse'}, {c:'🐹', k:'hamster'}, 
                {c:'🐰', k:'rabbit'}, {c:'🦊', k:'fox'}, {c:'🐻', k:'bear'}, {c:'🐼', k:'panda'}, 
                {c:'🐨', k:'koala'}, {c:'🐯', k:'tiger'}, {c:'🦁', k:'lion'}, {c:'🐮', k:'cow'}, 
                {c:'🐷', k:'pig'}, {c:'🐸', k:'frog'}, {c:'🐵', k:'monkey'}, {c:'🐔', k:'chicken'}, 
                {c:'🐧', k:'penguin'}, {c:'🐦', k:'bird'}, {c:'🐤', k:'chick'}, {c:'🦆', k:'duck'}, 
                {c:'🦅', k:'eagle'}, {c:'🦉', k:'owl'}, {c:'🦇', k:'bat'}, {c:'🐺', k:'wolf'}, 
                {c:'🐗', k:'boar'}, {c:'🐴', k:'horse'}, {c:'🦄', k:'unicorn'}, {c:'🐝', k:'bee'}, 
                {c:'🐛', k:'bug'}, {c:'🦋', k:'butterfly'}, {c:'🐌', k:'snail'}, {c:'🐞', k:'beetle'}, 
                {c:'🦗', k:'cricket'}, {c:'🕷️', k:'spider'}, {c:'🕸️', k:'web'}, {c:'🦂', k:'scorpion'}, 
                {c:'🦟', k:'mosquito'}, {c:'🦠', k:'microbe'}, {c:'💐', k:'bouquet'}, {c:'🌸', k:'cherry blossom'}, 
                {c:'💮', k:'white flower'}, {c:'🏵️', k:'rosette'}, {c:'🌹', k:'rose'}, {c:'🥀', k:'wilted flower'}, 
                {c:'🌺', k:'hibiscus'}, {c:'🌻', k:'sunflower'}, {c:'🌼', k:'blossom'}, {c:'🌷', k:'tulip'}, 
                {c:'🌱', k:'seedling'}, {c:'🌲', k:'evergreen'}, {c:'🌳', k:'tree'}, {c:'🌴', k:'palm tree'}, 
                {c:'🌵', k:'cactus'}, {c:'🌾', k:'sheaf'}, {c:'🌿', k:'herb'}, {c:'☘️', k:'shamrock'}, 
                {c:'🍀', k:'four leaf'}, {c:'🍁', k:'maple'}, {c:'🍂', k:'fallen leaf'}, {c:'🍃', k:'fluttering leaf'}
            ]},
            { id: 'food', name: 'Food & Drink', icon: '🍔', emojis: [
                {c:'🍇', k:'grapes'}, {c:'🍈', k:'melon'}, {c:'🍉', k:'watermelon'}, {c:'🍊', k:'tangerine'}, 
                {c:'🍋', k:'lemon'}, {c:'🍌', k:'banana'}, {c:'🍍', k:'pineapple'}, {c:'🥭', k:'mango'}, 
                {c:'🍎', k:'apple red'}, {c:'🍏', k:'apple green'}, {c:'🍐', k:'pear'}, {c:'🍑', k:'peach'}, 
                {c:'🍒', k:'cherries'}, {c:'🍓', k:'strawberry'}, {c:'🥝', k:'kiwi'}, {c:'🍅', k:'tomato'}, 
                {c:'🥥', k:'coconut'}, {c:'🥑', k:'avocado'}, {c:'🍆', k:'eggplant'}, {c:'🥔', k:'potato'}, 
                {c:'🥕', k:'carrot'}, {c:'🌽', k:'corn'}, {c:'🌶️', k:'hot pepper'}, {c:'🥒', k:'cucumber'}, 
                {c:'🥬', k:'leafy green'}, {c:'🥦', k:'broccoli'}, {c:'🧄', k:'garlic'}, {c:'🧅', k:'onion'}, 
                {c:'🍄', k:'mushroom'}, {c:'🥜', k:'peanuts'}, {c:'🌰', k:'chestnut'}, {c:'🍞', k:'bread'}, 
                {c:'🥐', k:'croissant'}, {c:'🥖', k:'baguette'}, {c:'🥨', k:'pretzel'}, {c:'🥯', k:'bagel'}, 
                {c:'🥞', k:'pancakes'}, {c:'🧇', k:'waffle'}, {c:'🧀', k:'cheese'}, {c:'🍖', k:'meat'}, 
                {c:'🍗', k:'poultry'}, {c:'🥩', k:'cut of meat'}, {c:'🥓', k:'bacon'}, {c:'🍔', k:'hamburger'}, 
                {c:'🍟', k:'fries'}, {c:'🍕', k:'pizza'}, {c:'🌭', k:'hot dog'}, {c:'🥪', k:'sandwich'}, 
                {c:'🌮', k:'taco'}, {c:'🌯', k:'burrito'}, {c:'🥙', k:'stuffed flatbread'}, {c:'🧆', k:'falafel'}, 
                {c:'🥚', k:'egg'}, {c:'🍳', k:'cooking'}, {c:'🥘', k:'pan food'}, {c:'🍲', k:'pot food'}, 
                {c:'🥣', k:'bowl'}, {c:'🥗', k:'salad'}, {c:'🍿', k:'popcorn'}, {c:'🧈', k:'butter'}, 
                {c:'🧂', k:'salt'}, {c:'🥫', k:'canned'}, {c:'🍱', k:'bento'}, {c:'🍘', k:'cracker'}, 
                {c:'🍙', k:'rice ball'}, {c:'🍚', k:'cooked rice'}, {c:'🍛', k:'curry'}, {c:'🍜', k:'steaming bowl'}, 
                {c:'🍝', k:'spaghetti'}, {c:'🍠', k:'potato roasted'}, {c:'🍢', k:'oden'}, {c:'🍣', k:'sushi'}, 
                {c:'🍤', k:'fried shrimp'}, {c:'🍥', k:'fish cake'}, {c:'🥮', k:'moon cake'}, {c:'🍡', k:'dango'}, 
                {c:'🥟', k:'dumpling'}, {c:'🥠', k:'fortune cookie'}, {c:'🥡', k:'takeout'}, {c:'🦀', k:'crab'}, 
                {c:'🦞', k:'lobster'}, {c:'🦐', k:'shrimp'}, {c:'🦑', k:'squid'}, {c:'🦪', k:'oyster'}, 
                {c:'🍦', k:'ice cream'}, {c:'🍧', k:'shaved ice'}, {c:'🍨', k:'ice cream'}, {c:'🍩', k:'doughnut'}, 
                {c:'🍪', k:'cookie'}, {c:'🎂', k:'cake birthday'}, {c:'🍰', k:'shortcake'}, {c:'🧁', k:'cupcake'}, 
                {c:'🥧', k:'pie'}, {c:'🍫', k:'chocolate'}, {c:'🍬', k:'candy'}, {c:'🍭', k:'lollipop'}, 
                {c:'🍮', k:'custard'}, {c:'🍯', k:'honey'}, {c:'🍼', k:'baby bottle'}, {c:'🥛', k:'milk'}, 
                {c:'☕', k:'coffee'}, {c:'🍵', k:'tea'}, {c:'🍶', k:'sake'}, {c:'🍾', k:'champagne'}, 
                {c:'🍷', k:'wine'}, {c:'🍸', k:'cocktail'}, {c:'🍹', k:'tropical'}, {c:'🍺', k:'beer'}, 
                {c:'🍻', k:'beers'}, {c:'🥂', k:'clinking'}, {c:'🥃', k:'whiskey'}, {c:'🥤', k:'cup'}, 
                {c:'🧃', k:'beverage box'}, {c:'🧉', k:'mate'}, {c:'🧊', k:'ice'}
            ]},
            { id: 'activity', name: 'Activity', icon: '⚽', emojis: [
                {c:'⚽', k:'soccer'}, {c:'🏀', k:'basketball'}, {c:'🏈', k:'football'}, {c:'⚾', k:'baseball'}, 
                {c:'🥎', k:'softball'}, {c:'🎾', k:'tennis'}, {c:'🏐', k:'volleyball'}, {c:'🏉', k:'rugby'}, 
                {c:'🥏', k:'frisbee'}, {c:'🎱', k:'pool'}, {c:'🪀', k:'yo-yo'}, {c:'🏓', k:'ping pong'}, 
                {c:'🏸', k:'badminton'}, {c:'🏒', k:'hockey'}, {c:'🏑', k:'field hockey'}, {c:'🥍', k:'lacrosse'}, 
                {c:'🏏', k:'cricket'}, {c:'🥅', k:'goal'}, {c:'⛳', k:'flag hole'}, {c:'🪁', k:'kite'}, 
                {c:'🏹', k:'archery'}, {c:'🎣', k:'fishing'}, {c:'🤿', k:'diving'}, {c:'🥊', k:'boxing'}, 
                {c:'🥋', k:'martial arts'}, {c:'🎽', k:'shirt'}, {c:'🛹', k:'skateboard'}, {c:'🛼', k:'roller skate'}, 
                {c:'🛷', k:'sled'}, {c:'⛸️', k:'ice skate'}, {c:'🥌', k:'curling'}, {c:'🎿', k:'ski'}, 
                {c:'⛷️', k:'skier'}, {c:'🏂', k:'snowboarder'}, {c:'🪂', k:'parachute'}, {c:'🏋️', k:'weight lifting'}, 
                {c:'🤼', k:'wrestling'}, {c:'🤸', k:'cartwheel'}, {c:'⛹️', k:'bouncing'}, {c:'🤺', k:'fencing'}, 
                {c:'🤾', k:'handball'}, {c:'🏌️', k:'golfing'}, {c:'🏇', k:'horse racing'}, {c:'🧘', k:'yoga'}, 
                {c:'🏄', k:'surfing'}, {c:'🏊', k:'swimming'}, {c:'🤽', k:'water polo'}, {c:'🚣', k:'rowing'}, 
                {c:'🧗', k:'climbing'}, {c:'🚵', k:'biking'}, {c:'🚴', k:'cyclist'}, {c:'🏆', k:'trophy'}, 
                {c:'🥇', k:'1st'}, {c:'🥈', k:'2nd'}, {c:'🥉', k:'3rd'}, {c:'🏅', k:'medal'}, 
                {c:'🎖️', k:'military'}, {c:'🏵️', k:'rosette'}, {c:'🎗️', k:'reminder'}, {c:'🎫', k:'ticket'}, 
                {c:'🎟️', k:'admission'}, {c:'🎪', k:'circus'}, {c:'🤹', k:'juggling'}, {c:'🎭', k:'performing arts'}, 
                {c:'🎨', k:'art'}, {c:'🎬', k:'clapper board'}, {c:'🎤', k:'microphone'}, {c:'🎧', k:'headphone'}, 
                {c:'🎼', k:'score'}, {c:'🎹', k:'musical keyboard'}, {c:'🥁', k:'drum'}, {c:'🎷', k:'sax'}, 
                {c:'🎺', k:'trumpet'}, {c:'🎸', k:'guitar'}, {c:'🪕', k:'banjo'}, {c:'🎻', k:'violin'}, 
                {c:'🎲', k:'game die'}, {c:'♟️', k:'pawn'}, {c:'🎯', k:'bullseye'}, {c:'🎳', k:'bowling'}, 
                {c:'🎮', k:'game controller'}, {c:'🎰', k:'slot machine'}, {c:'🧩', k:'puzzle'}
            ]},
            { id: 'objects', name: 'Objects & Symbols', icon: '💡', emojis: [
                {c:'⌚', k:'watch'}, {c:'📱', k:'mobile'}, {c:'📲', k:'calling'}, {c:'💻', k:'computer'}, 
                {c:'⌨️', k:'keyboard'}, {c:'🖥️', k:'desktop'}, {c:'🖨️', k:'printer'}, {c:'🖱️', k:'mouse'}, 
                {c:'🖲️', k:'trackball'}, {c:'🕹️', k:'joystick'}, {c:'🗜️', k:'clamp'}, {c:'💽', k:'minidisc'}, 
                {c:'💾', k:'floppy'}, {c:'💿', k:'cd'}, {c:'📀', k:'dvd'}, {c:'📼', k:'vhs'}, 
                {c:'📷', k:'camera'}, {c:'📸', k:'camera flash'}, {c:'📹', k:'video'}, {c:'🎥', k:'movie'}, 
                {c:'📽️', k:'projector'}, {c:'🎞️', k:'film'}, {c:'📞', k:'telephone'}, {c:'☎️', k:'phone'}, 
                {c:'📟', k:'pager'}, {c:'📠', k:'fax'}, {c:'📺', k:'tv'}, {c:'📻', k:'radio'}, 
                {c:'🎙️', k:'studio mic'}, {c:'🎚️', k:'level slider'}, {c:'🎛️', k:'control knobs'}, {c:'🧭', k:'compass'}, 
                {c:'⏱️', k:'stopwatch'}, {c:'⏲️', k:'timer'}, {c:'⏰', k:'clock'}, {c:'🕰️', k:'mantelpiece'}, 
                {c:'⌛', k:'hourglass'}, {c:'⏳', k:'hourglass flowing'}, {c:'📡', k:'satellite'}, {c:'🔋', k:'battery'}, 
                {c:'🔌', k:'plug'}, {c:'💡', k:'bulb'}, {c:'🔦', k:'flashlight'}, {c:'🕯️', k:'candle'}, 
                {c:'🪔', k:'diya'}, {c:'🧱', k:'brick'}, {c:'🧯', k:'extinguisher'}, {c:'🛢️', k:'oil drum'}, 
                {c:'💸', k:'money wings'}, {c:'💵', k:'dollar'}, {c:'💴', k:'yen'}, {c:'💶', k:'euro'}, 
                {c:'💷', k:'pound'}, {c:'💰', k:'money bag'}, {c:'💳', k:'credit card'}, {c:'💎', k:'gem'}, 
                {c:'⚖️', k:'balance'}, {c:'🧰', k:'toolbox'}, {c:'🔧', k:'wrench'}, {c:'🔨', k:'hammer'}, 
                {c:'⚒️', k:'hammer pick'}, {c:'🛠️', k:'hammer wrench'}, {c:'⛏️', k:'pick'}, {c:'🔩', k:'nut bolt'}, 
                {c:'⚙️', k:'gear'}, {c:'⛓️', k:'chains'}, {c:'🔫', k:'pistol'}, {c:'💣', k:'bomb'}, 
                {c:'🧨', k:'firecracker'}, {c:'🪓', k:'axe'}, {c:'🔪', k:'knife'}, {c:'🗡️', k:'dagger'}, 
                {c:'⚔️', k:'swords'}, {c:'🛡️', k:'shield'}, {c:'🚬', k:'smoking'}, {c:'⚰️', k:'coffin'}, 
                {c:'⚱️', k:'funeral urn'}, {c:'🏺', k:'amphora'}, {c:'🔮', k:'crystal ball'}, {c:'📿', k:'prayer beads'}, 
                {c:'🧿', k:'nazar'}, {c:'💈', k:'barber'}, {c:'⚗️', k:'alembic'}, {c:'🔭', k:'telescope'}, 
                {c:'🔬', k:'microscope'}, {c:'🕳️', k:'hole'}, {c:'💊', k:'pill'}, {c:'💉', k:'syringe'}, 
                {c:'🩸', k:'blood'}, {c:'🩹', k:'bandage'}, {c:'🩺', k:'stethoscope'}, {c:'🧬', k:'dna'}, 
                {c:'❤️', k:'heart'}, {c:'🧡', k:'orange heart'}, {c:'💛', k:'yellow heart'}, {c:'💚', k:'green heart'}, 
                {c:'💙', k:'blue heart'}, {c:'💜', k:'purple heart'}, {c:'🖤', k:'black heart'}, {c:'🤍', k:'white heart'}, 
                {c:'🤎', k:'brown heart'}, {c:'💔', k:'broken heart'}, {c:'❣️', k:'exclamation heart'}, {c:'💕', k:'two hearts'}, 
                {c:'💞', k:'revolving hearts'}, {c:'💓', k:'beating heart'}, {c:'💗', k:'growing heart'}, {c:'💖', k:'sparkling heart'}, 
                {c:'💘', k:'arrow heart'}, {c:'💝', k:'ribbon heart'}, {c:'💟', k:'decoration heart'}, {c:'☮️', k:'peace'}, 
                {c:'✝️', k:'latin cross'}, {c:'☪️', k:'star crescent'}, {c:'🕉️', k:'om'}, {c:'☸️', k:'wheel of dharma'}, 
                {c:'✡️', k:'star of david'}, {c:'🔯', k:'six pointed star'}, {c:'🕎', k:'menorah'}, {c:'☯️', k:'yin yang'}, 
                {c:'☦️', k:'orthodox'}, {c:'🛐', k:'place of worship'}, {c:'⛎', k:'ophiuchus'}, {c:'♈', k:'aries'}, 
                {c:'♉', k:'taurus'}, {c:'♊', k:'gemini'}, {c:'♋', k:'cancer'}, {c:'♌', k:'leo'}, 
                {c:'♍', k:'virgo'}, {c:'♎', k:'libra'}, {c:'♏', k:'scorpio'}, {c:'♐', k:'sagittarius'}, 
                {c:'♑', k:'capricorn'}, {c:'♒', k:'aquarius'}, {c:'♓', k:'pisces'}, {c:'🆔', k:'id'}, 
                {c:'⚛️', k:'atom'}, {c:'🉑', k:'accept'}, {c:'☢️', k:'radioactive'}, {c:'☣️', k:'biohazard'}, 
                {c:'📴', k:'mobile off'}, {c:'📳', k:'vibration'}, {c:'🈶', k:'have'}, {c:'🈚', k:'no'}, 
                {c:'🈸', k:'application'}, {c:'🈺', k:'open'}, {c:'🈷️', k:'month'}, {c:'✴️', k:'eight pointed star'}, 
                {c:'🆚', k:'vs'}, {c:'💮', k:'white flower'}, {c:'🉐', k:'advantage'}, {c:'㊙️', k:'secret'}, 
                {c:'㊗️', k:'congratulations'}, {c:'🈴', k:'match'}, {c:'🈵', k:'full'}, {c:'🈹', k:'discount'}, 
                {c:'🈲', k:'prohibit'}, {c:'🅰️', k:'a button'}, {c:'🅱️', k:'b button'}, {c:'🆎', k:'ab button'}, 
                {c:'🆑', k:'cl button'}, {c:'🅾️', k:'o button'}, {c:'🆘', k:'sos'}, {c:'❌', k:'cross mark'}, 
                {c:'⭕', k:'circle mark'}, {c:'🛑', k:'stop'}, {c:'⛔', k:'no entry'}, {c:'📛', k:'no entry sign'}, 
                {c:'🚫', k:'prohibited'}, {c:'💯', k:'hundred'}, {c:'💢', k:'anger'}, {c:'♨️', k:'hot springs'}, 
                {c:'🚷', k:'no pedestrians'}, {c:'🚯', k:'no littering'}, {c:'🚳', k:'no bicycles'}, {c:'🚱', k:'non potable'}, 
                {c:'🔞', k:'no under 18'}, {c:'📵', k:'no mobile'}, {c:'🚭', k:'no smoking'}, {c:'❗', k:'exclamation'}, 
                {c:'❕', k:'white exclamation'}, {c:'❓', k:'question'}, {c:'❔', k:'white question'}, {c:'‼️', k:'double exclamation'}, 
                {c:'⁉️', k:'interrobang'}, {c:'🔅', k:'dim button'}, {c:'🔆', k:'bright button'}, {c:'〽️', k:'part alternation'}, 
                {c:'⚠️', k:'warning'}, {c:'🚸', k:'children crossing'}, {c:'🔱', k:'trident'}, {c:'⚜️', k:'fleur de lis'}, 
                {c:'🔰', k:'beginner'}, {c:'♻️', k:'recycle'}, {c:'✅', k:'check mark'}, {c:'🈯', k:'reserved'}, 
                {c:'💹', k:'chart'}, {c:'❇️', k:'sparkle'}, {c:'✳️', k:'eight spoked'}, {c:'❎', k:'cross mark button'}, 
                {c:'🌐', k:'globe'}, {c:'💠', k:'diamond'}, {c:'Ⓜ️', k:'m'}, {c:'🌀', k:'cyclone'}, 
                {c:'💤', k:'zzz'}, {c:'🏧', k:'atm'}, {c:'🚾', k:'wc'}, {c:'♿', k:'wheelchair'}, 
                {c:'🅿️', k:'parking'}, {c:'🈳', k:'vacancy'}, {c:'🈂️', k:'service'}, {c:'🛂', k:'passport control'}, 
                {c:'🛃', k:'customs'}, {c:'🛄', k:'baggage claim'}, {c:'🛅', k:'left luggage'}, {c:'🚹', k:'mens room'}, 
                {c:'🚺', k:'womens room'}, {c:'🚼', k:'baby symbol'}, {c:'🚻', k:'restroom'}, {c:'🚮', k:'put litter'}, 
                {c:'🎦', k:'cinema'}, {c:'📶', k:'signal strength'}, {c:'🈁', k:'koko'}, {c:'🔣', k:'symbols'}, 
                {c:'ℹ️', k:'information'}, {c:'🔤', k:'abc'}, {c:'🔡', k:'abcd'}, {c:'🔠', k:'capital abcd'}, 
                {c:'🆖', k:'ng'}, {c:'🆗', k:'ok button'}, {c:'🆙', k:'up'}, {c:'🆒', k:'cool'}, 
                {c:'🆕', k:'new'}, {c:'🆓', k:'free'}, {c:'0️⃣', k:'zero'}, {c:'1️⃣', k:'one'}, 
                {c:'2️⃣', k:'two'}, {c:'3️⃣', k:'three'}, {c:'4️⃣', k:'four'}, {c:'5️⃣', k:'five'}, 
                {c:'6️⃣', k:'six'}, {c:'7️⃣', k:'seven'}, {c:'8️⃣', k:'eight'}, {c:'9️⃣', k:'nine'}, 
                {c:'🔟', k:'ten'}, {c:'🔢', k:'input numbers'}, {c:'#️⃣', k:'hash'}, {c:'*️⃣', k:'star'}, 
                {c:'⏏️', k:'eject'}, {c:'▶️', k:'play'}, {c:'⏸️', k:'pause'}, {c:'⏯️', k:'play pause'}, 
                {c:'⏹️', k:'stop button'}, {c:'⏺️', k:'record'}, {c:'⏭️', k:'next track'}, {c:'⏮️', k:'prev track'}, 
                {c:'⏩', k:'fast forward'}, {c:'⏪', k:'fast reverse'}, {c:'⏫', k:'fast up'}, {c:'⏬', k:'fast down'}, 
                {c:'◀️', k:'reverse'}, {c:'🔼', k:'up button'}, {c:'🔽', k:'down button'}, {c:'➡️', k:'right arrow'}, 
                {c:'⬅️', k:'left arrow'}, {c:'⬆️', k:'up arrow'}, {c:'⬇️', k:'down arrow'}, {c:'↗️', k:'up right'}, 
                {c:'↘️', k:'down right'}, {c:'↙️', k:'down left'}, {c:'↖️', k:'up left'}, {c:'↕️', k:'up down'}, 
                {c:'↔️', k:'left right'}, {c:'🔄', k:'counterclockwise'}, {c:'↪️', k:'left arrow curver'}, {c:'↩️', k:'right arrow curver'}, 
                {c:'⤴️', k:'arrow up curver'}, {c:'⤵️', k:'arrow down curver'}, {c:'🔀', k:'shuffle'}, {c:'🔁', k:'repeat'}, 
                {c:'🔂', k:'repeat one'}, {c:'▶️', k:'play'}, {c:'⏩', k:'fast'}, {c:'⏭️', k:'next'}, 
                {c:'⏯️', k:'play pause'}, {c:'◀️', k:'reverse'}, {c:'⏪', k:'rewind'}, {c:'⏮️', k:'prev'}, 
                {c:'🔼', k:'up'}, {c:'⏫', k:'fast up'}, {c:'🔽', k:'down'}, {c:'⏬', k:'fast down'}, 
                {c:'⏸️', k:'pause'}, {c:'⏹️', k:'stop'}, {c:'⏺️', k:'record'}, {c:'⏏️', k:'eject'}, 
                {c:'🎦', k:'cinema'}, {c:'🔅', k:'low brightness'}, {c:'🔆', k:'high brightness'}, {c:'📶', k:'signal'}, 
                {c:'📳', k:'vibrate'}, {c:'📴', k:'mobile off'}, {c:'♀️', k:'female'}, {c:'♂️', k:'male'}, 
                {c:'⚕️', k:'medicine'}, {c:'♾️', k:'infinity'}, {c:'♻️', k:'recycle'}, {c:'⚜️', k:'fleur de lis'}, 
                {c:'🔱', k:'trident'}, {c:'📛', k:'badge'}, {c:'🔰', k:'japanese symbol'}, {c:'⭕', k:'circle'}, 
                {c:'✅', k:'check'}, {c:'☑️', k:'check box'}, {c:'✔️', k:'check mark'}, {c:'✖️', k:'multiply'}, 
                {c:'❌', k:'cross'}, {c:'❎', k:'cross box'}, {c:'➕', k:'plus'}, {c:'➖', k:'minus'}, 
                {c:'➗', k:'divide'}, {c:'➰', k:'curly loop'}, {c:'➿', k:'double loop'}, {c:'〽️', k:'part alternation'}, 
                {c:'✳️', k:'asterisk'}, {c:'✴️', k:'eight point star'}, {c:'❇️', k:'sparkle'}, {c:'‼️', k:'double exclamation'}, 
                {c:'⁉️', k:'interrobang'}, {c:'❓', k:'question'}, {c:'❔', k:'white question'}, {c:'❕', k:'white exclamation'}, 
                {c:'❗', k:'exclamation'}, {c:'〰️', k:'wavy dash'}, {c:'©️', k:'copyright'}, {c:'®️', k:'registered'}, 
                {c:'™️', k:'trademark'}, {c:'#️⃣', k:'hash'}, {c:'*️⃣', k:'star key'}, {c:'0️⃣', k:'zero'}, 
                {c:'1️⃣', k:'one'}, {c:'2️⃣', k:'two'}, {c:'3️⃣', k:'three'}, {c:'4️⃣', k:'four'}, 
                {c:'5️⃣', k:'five'}, {c:'6️⃣', k:'six'}, {c:'7️⃣', k:'seven'}, {c:'8️⃣', k:'eight'}, 
                {c:'9️⃣', k:'nine'}, {c:'🔟', k:'ten'}, {c:'💯', k:'hundred'}, {c:'🔠', k:'capital'}, 
                {c:'🔡', k:'lowercase'}, {c:'🔢', k:'numbers'}, {c:'🔣', k:'symbols'}, {c:'🔤', k:'latin'}, 
                {c:'🅰️', k:'a'}, {c:'🆎', k:'ab'}, {c:'🅱️', k:'b'}, {c:'🆑', k:'cl'}, 
                {c:'🆒', k:'cool'}, {c:'🆓', k:'free'}, {c:'ℹ️', k:'info'}, {c:'🆔', k:'id'}, 
                {c:'Ⓜ️', k:'m'}, {c:'🆕', k:'new'}, {c:'🆖', k:'ng'}, {c:'🅾️', k:'o'}, 
                {c:'🆗', k:'ok'}, {c:'🅿️', k:'parking'}, {c:'🆘', k:'sos'}, {c:'🆙', k:'up'}, 
                {c:'🆚', k:'vs'}, {c:'🈁', k:'koko'}, {c:'🈂️', k:'sa'}, {c:'🈷️', k:'moon'}, 
                {c:'🈶', k:'paid'}, {c:'🈯', k:'reserved'}, {c:'🉐', k:'bargain'}, {c:'🈹', k:'discount'}, 
                {c:'🈚', k:'free'}, {c:'🈲', k:'prohibited'}, {c:'🉑', k:'acceptable'}, {c:'🈸', k:'application'}, 
                {c:'🈴', k:'passing grade'}, {c:'🈳', k:'vacancy'}, {c:'㊗️', k:'congrats'}, {c:'㊙️', k:'secret'}, 
                {c:'🈺', k:'open'}, {c:'🈵', k:'full'}, {c:'🔴', k:'red circle'}, {c:'🟠', k:'orange circle'}, 
                {c:'🟡', k:'yellow circle'}, {c:'🟢', k:'green circle'}, {c:'🔵', k:'blue circle'}, {c:'🟣', k:'purple circle'}, 
                {c:'🟤', k:'brown circle'}, {c:'⚫', k:'black circle'}, {c:'⚪', k:'white circle'}, {c:'🟥', k:'red square'}, 
                {c:'🟧', k:'orange square'}, {c:'🟨', k:'yellow square'}, {c:'🟩', k:'green square'}, {c:'🟦', k:'blue square'}, 
                {c:'🟪', k:'purple square'}, {c:'🟫', k:'brown square'}, {c:'⬛', k:'black large square'}, {c:'⬜', k:'white large square'}, 
                {c:'◼️', k:'black medium square'}, {c:'◻️', k:'white medium square'}, {c:'◾', k:'black medium small square'}, {c:'◽', k:'white medium small square'}, 
                {c:'▪️', k:'black small square'}, {c:'▫️', k:'white small square'}, {c:'🔶', k:'large orange diamond'}, {c:'🔷', k:'large blue diamond'}, 
                {c:'🔸', k:'small orange diamond'}, {c:'🔹', k:'small blue diamond'}, {c:'🔺', k:'up triangle'}, {c:'🔻', k:'down triangle'}, 
                {c:'💠', k:'diamond with dot'}, {c:'🔘', k:'radio button'}, {c:'🔳', k:'black square button'}, {c:'🔲', k:'white square button'}
            ]}
        ];
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    background: #121212;
                    height: 100%;
                    width: 100%;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    overflow: hidden;
                }
                .ep-header {
                    padding: 8px 12px;
                    border-bottom: 1px solid #262626;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(18,18,18,0.95);
                }
                .ep-search {
                    flex: 1;
                    background: #262626;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 12px;
                    color: #fff;
                    font-size: 14px;
                    outline: none;
                }
                .ep-skin-tone {
                    font-size: 1.2rem;
                    cursor: pointer;
                    user-select: none;
                    filter: grayscale(0.5);
                    transition: filter 0.2s;
                }
                .ep-skin-tone:active { transform: scale(0.9); }
                .ep-nav {
                    display: flex;
                    overflow-x: auto;
                    padding: 6px 4px;
                    border-bottom: 1px solid #262626;
                    gap: 4px;
                    scrollbar-width: none;
                }
                .ep-nav::-webkit-scrollbar { display: none; }
                .ep-nav-item {
                    font-size: 1.2rem;
                    padding: 6px 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    opacity: 0.5;
                    transition: opacity 0.2s, background 0.2s;
                }
                .ep-nav-item.active { opacity: 1; background: #262626; }
                
                .ep-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                    scroll-behavior: smooth;
                }
                .ep-category-title {
                    font-size: 0.75rem;
                    color: #888;
                    margin: 15px 0 8px 5px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .ep-grid {
                    display: grid;
                    grid-template-columns: repeat(8, 1fr);
                    gap: 8px;
                }
                .ep-emoji {
                    font-size: 1.7rem;
                    cursor: pointer;
                    text-align: center;
                    border-radius: 6px;
                    transition: transform 0.1s, background 0.1s;
                    user-select: none;
                }
                .ep-emoji:active { transform: scale(1.2); background: #333; }
                
                /* Context Menu for Recents Clear */
                #recents-context {
                    position: absolute; display: none;
                    background: #333; color: white;
                    padding: 8px 12px; border-radius: 8px;
                    font-size: 0.8rem; z-index: 100;
                }
            </style>
            <div class="ep-header">
                <input type="text" class="ep-search" placeholder="Search emoji...">
                <div class="ep-skin-tone">🖐️</div>
            </div>
            <div class="ep-nav" id="nav-bar"></div>
            <div class="ep-body" id="emoji-body"></div>
            <div id="recents-context">Clear Recents</div>
        `;
    }

    setupEvents() {
        const searchInput = this.shadowRoot.querySelector('.ep-search');
        searchInput.addEventListener('input', (e) => this.filterEmojis(e.target.value));

        const skinToneBtn = this.shadowRoot.querySelector('.ep-skin-tone');
        skinToneBtn.addEventListener('click', () => this.toggleSkinTone());

        const recentsBtn = this.shadowRoot.getElementById('recents-context');
        recentsBtn.addEventListener('click', () => {
            this.recentEmojis = [];
            localStorage.setItem('goorac_recents', JSON.stringify([]));
            this.renderEmojis(this.emojiData.find(c => c.id === 'recents') ? 'all' : 'all'); // Refresh
            recentsBtn.style.display = 'none';
        });
    }

    toggleSkinTone() {
        const tones = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];
        let currentIdx = tones.indexOf(this.skinTone);
        let nextIdx = (currentIdx + 1) % tones.length;
        this.skinTone = tones[nextIdx];
        localStorage.setItem('goorac_skin_tone', this.skinTone);
        
        // Update Icon
        const toneIcons = ['🖐️', '🖐🏻', '🖐🏼', '🖐🏽', '🖐🏾', '🖐🏿'];
        this.shadowRoot.querySelector('.ep-skin-tone').innerText = toneIcons[nextIdx];
        
        // Re-render
        this.loadEmojis('all'); 
    }

    applySkinTone(emoji, hasSkin) {
        if (!hasSkin || !this.skinTone) return emoji;
        // Simple append for supported emojis (basic implementation)
        return emoji + this.skinTone;
    }

    loadEmojis(filter) {
        const navBar = this.shadowRoot.getElementById('nav-bar');
        const body = this.shadowRoot.getElementById('emoji-body');
        
        navBar.innerHTML = '';
        body.innerHTML = '';

        // Add Recents Category dynamically
        let displayData = [...this.emojiData];
        if (this.recentEmojis.length > 0) {
            displayData.unshift({
                id: 'recents', name: 'Recent', icon: '🕒', 
                emojis: this.recentEmojis.map(e => ({c: e, k: 'recent'})) 
            });
        }

        // Build Nav
        displayData.forEach(cat => {
            if(cat.id === 'recents' && this.recentEmojis.length === 0) return;
            const span = document.createElement('span');
            span.className = 'ep-nav-item';
            span.innerText = cat.icon;
            span.onclick = () => {
                const el = this.shadowRoot.getElementById(`cat-${cat.id}`);
                if(el) el.scrollIntoView({block: 'start'});
                this.shadowRoot.querySelectorAll('.ep-nav-item').forEach(i => i.classList.remove('active'));
                span.classList.add('active');
            };
            navBar.appendChild(span);
        });

        // Build Body
        displayData.forEach(cat => {
            const catContainer = document.createElement('div');
            catContainer.id = `cat-${cat.id}`;
            
            const title = document.createElement('div');
            title.className = 'ep-category-title';
            title.innerText = cat.name;
            
            if(cat.id === 'recents') {
                 title.addEventListener('contextmenu', (e) => {
                     e.preventDefault();
                     const ctx = this.shadowRoot.getElementById('recents-context');
                     ctx.style.display = 'block';
                     ctx.style.left = e.offsetX + 'px';
                     ctx.style.top = e.offsetY + 'px';
                 });
            }

            const grid = document.createElement('div');
            grid.className = 'ep-grid';

            cat.emojis.forEach(eObj => {
                const el = document.createElement('div');
                el.className = 'ep-emoji';
                // Apply skin tone if applicable (eObj.s = skin tone supported)
                const finalEmoji = eObj.s ? this.applySkinTone(eObj.c, true) : eObj.c;
                el.innerText = finalEmoji;
                el.onclick = () => {
                    this.addToRecents(eObj.c); // Save BASE emoji to recents
                    this.dispatchEvent(new CustomEvent('emoji-click', { 
                        detail: { emoji: finalEmoji, unicode: finalEmoji },
                        bubbles: true, 
                        composed: true 
                    }));
                };
                grid.appendChild(el);
            });

            catContainer.appendChild(title);
            catContainer.appendChild(grid);
            body.appendChild(catContainer);
        });
    }

    filterEmojis(query) {
        const body = this.shadowRoot.getElementById('emoji-body');
        body.innerHTML = '';
        if(!query) {
            this.loadEmojis('all');
            return;
        }
        
        const grid = document.createElement('div');
        grid.className = 'ep-grid';
        grid.style.marginTop = '10px';

        let count = 0;
        this.emojiData.forEach(cat => {
            cat.emojis.forEach(e => {
                if(count > 100) return; // Limit search results
                if(e.k.includes(query.toLowerCase()) || e.c === query) {
                    const el = document.createElement('div');
                    el.className = 'ep-emoji';
                    const finalEmoji = e.s ? this.applySkinTone(e.c, true) : e.c;
                    el.innerText = finalEmoji;
                    el.onclick = () => {
                        this.addToRecents(e.c);
                        this.dispatchEvent(new CustomEvent('emoji-click', { detail: { emoji: finalEmoji } }));
                    };
                    grid.appendChild(el);
                    count++;
                }
            });
        });
        body.appendChild(grid);
    }

    addToRecents(char) {
        // Remove if exists, add to front
        this.recentEmojis = this.recentEmojis.filter(e => e !== char);
        this.recentEmojis.unshift(char);
        if(this.recentEmojis.length > 24) this.recentEmojis.pop(); // Max 24
        localStorage.setItem('goorac_recents', JSON.stringify(this.recentEmojis));
    }
}

customElements.define('emoji-picker', EmojiPicker);
