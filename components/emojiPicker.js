class EmojiPicker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Load recents and limit to 16 (2 lines of 8)
        let savedRecents = JSON.parse(localStorage.getItem('goorac_recents')) || [];
        this.recentEmojis = savedRecents.slice(0, 16);
        
        // AI / ML Usage Tracking for Suggestions
        this.emojiFrequency = JSON.parse(localStorage.getItem('goorac_emoji_freq')) || {};
        
        this.emojiData = this.getComprehensiveEmojiData();
        this.activeFilter = '';
        this.scrollTimeout = null;
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
        this.loadEmojis('all');
    }

    getComprehensiveEmojiData() {
        return [
            { id: 'smileys', name: 'Smileys & Emotion', icon: '😀', emojis: [
                {c:'😀', k:'smile happy'}, {c:'😃', k:'smile happy'}, {c:'😄', k:'smile happy'}, {c:'😁', k:'grin'}, {c:'😆', k:'laugh'}, {c:'😅', k:'sweat smile'}, 
                {c:'🤣', k:'rofl rolling floor laughing'}, {c:'😂', k:'joy tears'}, {c:'🙂', k:'smile'}, {c:'🙃', k:'upside down'}, {c:'😉', k:'wink'}, {c:'😊', k:'blush'}, 
                {c:'😇', k:'halo angel'}, {c:'🥰', k:'love affection'}, {c:'😍', k:'heart eyes'}, {c:'🤩', k:'star eyes excited'}, {c:'😘', k:'kiss'}, {c:'😗', k:'kiss'}, 
                {c:'☺️', k:'smile'}, {c:'😚', k:'kiss'}, {c:'😙', k:'kiss'}, {c:'😋', k:'yum delicious'}, {c:'😛', k:'tongue'}, {c:'😜', k:'wink tongue crazy'}, 
                {c:'🤪', k:'zany goofy'}, {c:'😝', k:'squint tongue'}, {c:'🤑', k:'money rich'}, {c:'🤗', k:'hugs open hands'}, {c:'🤭', k:'hand mouth oops'}, {c:'🤫', k:'shh quiet'}, 
                {c:'🤔', k:'think hmm'}, {c:'🤐', k:'zipper quiet'}, {c:'🤨', k:'eyebrow suspect'}, {c:'😐', k:'neutral'}, {c:'😑', k:'expressionless annoyed'}, {c:'😶', k:'no mouth silent'}, 
                {c:'😏', k:'smirk flirt'}, {c:'😒', k:'unamused meh'}, {c:'🙄', k:'roll eyes whatever'}, {c:'😬', k:'grimace awkward'}, {c:'🤥', k:'lying pinocchio'}, {c:'😌', k:'relieved peace'}, 
                {c:'😔', k:'pensive sad'}, {c:'😪', k:'sleepy'}, {c:'🤤', k:'drool hungry'}, {c:'😴', k:'sleep zzz'}, {c:'😷', k:'mask sick covid'}, {c:'🤒', k:'thermometer fever'}, 
                {c:'🤕', k:'bandage hurt'}, {c:'🤢', k:'nauseated sick'}, {c:'🤮', k:'vomit throw up'}, {c:'🤧', k:'sneeze bless you'}, {c:'🥵', k:'hot sweat'}, {c:'🥶', k:'cold freezing'}, 
                {c:'🥴', k:'woozy drunk'}, {c:'😵', k:'dizzy'}, {c:'🤯', k:'explode mind blown'}, {c:'🤠', k:'cowboy yeehaw'}, {c:'🥳', k:'party celebrate'}, {c:'😎', k:'cool sunglasses'}, 
                {c:'🤓', k:'nerd geek'}, {c:'🧐', k:'monocle fancy'}, {c:'😕', k:'confused huh'}, {c:'😟', k:'worried'}, {c:'🙁', k:'frown sad'}, {c:'😮', k:'open mouth wow'}, 
                {c:'😯', k:'hushed'}, {c:'😲', k:'astonished shock'}, {c:'😳', k:'flushed embarrassed'}, {c:'🥺', k:'pleading puppy eyes'}, {c:'😦', k:'frowning'}, {c:'😧', k:'anguished'}, 
                {c:'😨', k:'fearful scared'}, {c:'😰', k:'cold sweat nervous'}, {c:'😥', k:'disappointed relief'}, {c:'😢', k:'cry tear'}, {c:'😭', k:'sob crying loudly'}, {c:'😱', k:'scream horror'}, 
                {c:'😖', k:'confounded'}, {c:'😣', k:'persevering struggle'}, {c:'😞', k:'disappointed sad'}, {c:'😓', k:'sweat hard work'}, {c:'😩', k:'weary tired'}, {c:'😫', k:'tired exhausted'}, 
                {c:'🥱', k:'yawn sleepy'}, {c:'😤', k:'triumph mad'}, {c:'😡', k:'pout angry'}, {c:'😠', k:'angry mad'}, {c:'🤬', k:'cursing swear'}, {c:'😈', k:'devil evil'}, 
                {c:'👿', k:'devil angry'}, {c:'💀', k:'skull dead'}, {c:'☠️', k:'skull bones danger'}, {c:'💩', k:'poop crap'}, {c:'🤡', k:'clown fool'}, {c:'👹', k:'ogre monster'}, 
                {c:'👺', k:'goblin'}, {c:'👻', k:'ghost spooky'}, {c:'👽', k:'alien ufo'}, {c:'👾', k:'monster game'}, {c:'🤖', k:'robot ai'}, {c:'😺', k:'cat smile'}, 
                {c:'😸', k:'cat grin'}, {c:'😹', k:'cat joy tears'}, {c:'😻', k:'cat love'}, {c:'😼', k:'cat wry'}, {c:'😽', k:'cat kiss'}, {c:'🙀', k:'cat scream'}, 
                {c:'😿', k:'cat crying'}, {c:'😾', k:'cat pout'}, {c:'💋', k:'kiss mark lips'}, {c:'👋', k:'wave hello bye'}, {c:'🤚', k:'back hand'}, 
                {c:'🖐️', k:'fingers splayed stop'}, {c:'✋', k:'hand high five'}, {c:'🖖', k:'vulcan star trek'}, {c:'👌', k:'ok perfect'}, {c:'🤌', k:'pinched fingers italian'}, 
                {c:'🤏', k:'pinching tiny small'}, {c:'✌️', k:'victory peace'}, {c:'🤞', k:'crossed luck hope'}, {c:'🤟', k:'love you'}, {c:'🤘', k:'rock on metal'}, 
                {c:'🤙', k:'call me shaka'}, {c:'👈', k:'point left'}, {c:'👉', k:'point right'}, {c:'👆', k:'point up'}, {c:'🖕', k:'middle finger fuck'}, 
                {c:'👇', k:'point down'}, {c:'☝️', k:'index up wait'}, {c:'👍', k:'thumbs up yes good'}, {c:'👎', k:'thumbs down no bad'}, {c:'✊', k:'fist power'}, 
                {c:'👊', k:'punch brofist'}, {c:'🤛', k:'left fist'}, {c:'🤜', k:'right fist'}, {c:'👏', k:'clap applause'}, {c:'🙌', k:'hands up praise'}, 
                {c:'👐', k:'open hands'}, {c:'🤲', k:'palms up pray'}, {c:'🤝', k:'handshake deal'}, {c:'🙏', k:'pray please thanks'}, {c:'✍️', k:'write pen'}, 
                {c:'💅', k:'nail polish sassy'}, {c:'🤳', k:'selfie phone'}, {c:'💪', k:'muscle strong flex'}, {c:'🦵', k:'leg'}, {c:'🦶', k:'foot'}, 
                {c:'👂', k:'ear listen'}, {c:'🦻', k:'hearing aid'}, {c:'👃', k:'nose smell'}, {c:'🧠', k:'brain smart mind'}, {c:'🫀', k:'anatomical heart real'}, 
                {c:'🫁', k:'lungs breathe'}, {c:'🦷', k:'tooth dentist'}, {c:'🦴', k:'bone dog'}, {c:'👀', k:'eyes look stare'}, {c:'👁️', k:'eye illuminati'}, {c:'👅', k:'tongue lick'}, {c:'👄', k:'mouth lips'}
            ]},
            { id: 'people', name: 'People', icon: '👤', emojis: [
                {c:'👶', k:'baby infant'}, {c:'🧒', k:'child kid'}, {c:'👦', k:'boy'}, {c:'👧', k:'girl'}, {c:'🧑', k:'person adult'}, 
                {c:'👱', k:'blond hair'}, {c:'👨', k:'man guy'}, {c:'🧔', k:'beard hipster'}, {c:'👨‍🦰', k:'red hair ginger'}, {c:'👨‍🦱', k:'curly hair'}, 
                {c:'👨‍🦳', k:'white hair old'}, {c:'👨‍🦲', k:'bald no hair'}, {c:'👩', k:'woman lady'}, {c:'👩‍🦰', k:'red hair ginger'}, {c:'👩‍🦱', k:'curly hair'}, 
                {c:'👩‍🦳', k:'white hair old'}, {c:'👩‍🦲', k:'bald'}, {c:'🧓', k:'older person elder'}, {c:'👴', k:'old man grandpa'}, {c:'👵', k:'old woman grandma'}, 
                {c:'🙍', k:'frowning person upset'}, {c:'🙎', k:'pouting person mad'}, {c:'🙅', k:'no gesture cross x'}, {c:'🙆', k:'ok gesture circle'}, 
                {c:'💁', k:'tipping hand sassy'}, {c:'🙋', k:'raising hand question'}, {c:'🙇', k:'bowing sorry respect'}, {c:'🤦', k:'facepalm stupid sigh'}, {c:'🤷', k:'shrug idk whatever'}, 
                {c:'👨‍⚕️', k:'health worker doctor'}, {c:'👨‍🎓', k:'student graduate'}, {c:'👨‍🏫', k:'teacher professor'}, {c:'👨‍⚖️', k:'judge lawyer'}, {c:'👨‍🌾', k:'farmer'}, 
                {c:'👨‍🍳', k:'cook chef food'}, {c:'👨‍🔧', k:'mechanic fix wrench'}, {c:'👨‍🏭', k:'factory worker'}, {c:'👨‍💼', k:'office worker boss ceo'}, {c:'👨‍🔬', k:'scientist lab'}, 
                {c:'👨‍💻', k:'technologist coder dev hacker'}, {c:'👨‍🎤', k:'singer star'}, {c:'👨‍🎨', k:'artist painter'}, {c:'👨‍✈️', k:'pilot fly'}, {c:'👨‍🚀', k:'astronaut space'}, 
                {c:'👨‍🚒', k:'firefighter fire'}, {c:'👮', k:'police cop'}, {c:'🕵️', k:'detective spy'}, {c:'💂', k:'guard'}, {c:'👷', k:'construction builder'}, 
                {c:'🤴', k:'prince king'}, {c:'👸', k:'princess queen'}, {c:'👳', k:'turban'}, {c:'👲', k:'cap'}, {c:'🧕', k:'headscarf hijab'}, 
                {c:'🤵', k:'tuxedo groom fancy'}, {c:'👰', k:'veil bride wedding'}, {c:'🤰', k:'pregnant expecting'}, {c:'🤱', k:'breast feeding mother'}, {c:'👼', k:'angel cute'}, 
                {c:'🎅', k:'santa christmas'}, {c:'🧛', k:'vampire dracula blood'}, {c:'🧟', k:'zombie dead walking'}, {c:'🧞', k:'genie magic wish'}, {c:'🧜', k:'merperson mermaid'}, 
                {c:'🧚', k:'fairy magic'}, {c:'🚶', k:'walking stroll'}, {c:'🧍', k:'standing wait'}, {c:'🧎', k:'kneeling pray'}, {c:'🏃', k:'running fast dash'}, 
                {c:'💃', k:'dancing party salsa'}, {c:'🕺', k:'man dancing disco'}, {c:'👯', k:'people dancing twins'}, {c:'🧖', k:'steamy room sauna'}, {c:'🧘', k:'yoga meditate zen'},
                {c:'🗣️', k:'speaking talking shout'}, {c:'👤', k:'silhouette shadow user'}, {c:'👥', k:'silhouettes users group'}, {c:'🫂', k:'hug embrace support'}
            ]},
            { id: 'nature', name: 'Nature', icon: '🐻', emojis: [
                {c:'🐶', k:'dog puppy pet'}, {c:'🐱', k:'cat kitten pet'}, {c:'🐭', k:'mouse rat'}, {c:'🐹', k:'hamster'}, {c:'🐰', k:'rabbit bunny'}, {c:'🦊', k:'fox sneaky'}, 
                {c:'🐻', k:'bear'}, {c:'🐼', k:'panda cute'}, {c:'🐨', k:'koala australia'}, {c:'🐯', k:'tiger wild'}, {c:'🦁', k:'lion king roar'}, {c:'🐮', k:'cow moo'}, 
                {c:'🐷', k:'pig oink'}, {c:'🐽', k:'pig nose'}, {c:'🐸', k:'frog toad'}, {c:'🐵', k:'monkey ape'}, {c:'🙈', k:'see no evil shy'}, {c:'🙉', k:'hear no evil'}, 
                {c:'🙊', k:'speak no evil secret'}, {c:'🐒', k:'monkey'}, {c:'🐔', k:'chicken hen'}, {c:'🐧', k:'penguin cold'}, {c:'🐦', k:'bird tweet fly'}, {c:'🐤', k:'chick baby'}, 
                {c:'🐣', k:'hatching chick egg'}, {c:'🐥', k:'front chick'}, {c:'🦆', k:'duck quack'}, {c:'🦅', k:'eagle bird of prey'}, {c:'🦉', k:'owl wise night'}, {c:'🦇', k:'bat vampire'}, 
                {c:'🐺', k:'wolf howl'}, {c:'🐗', k:'boar wild'}, {c:'🐴', k:'horse ride'}, {c:'🦄', k:'unicorn magic fantasy'}, {c:'🐝', k:'bee honey bug'}, {c:'🐛', k:'bug caterpillar'}, 
                {c:'🦋', k:'butterfly beautiful'}, {c:'🐌', k:'snail slow'}, {c:'🐚', k:'shell beach'}, {c:'🐞', k:'beetle ladybug'}, {c:'🐜', k:'ant insect'}, {c:'🦗', k:'cricket chirp'}, 
                {c:'🕷️', k:'spider web creepy'}, {c:'🕸️', k:'web spider'}, {c:'🦂', k:'scorpion sting'}, {c:'🦟', k:'mosquito bite bug'}, {c:'🦠', k:'microbe virus covid'}, {c:'🐢', k:'turtle slow'}, 
                {c:'🐍', k:'snake slither toxic'}, {c:'🦎', k:'lizard reptile'}, {c:'🦖', k:'t-rex dinosaur t rex'}, {c:'🦕', k:'sauropod dinosaur dino'}, {c:'🐙', k:'octopus ocean'}, {c:'🦑', k:'squid kraken'}, 
                {c:'🦐', k:'shrimp prawn'}, {c:'🦞', k:'lobster'}, {c:'🦀', k:'crab snip'}, {c:'🐡', k:'blowfish puffer'}, {c:'🐠', k:'tropical fish nemo'}, {c:'🐟', k:'fish swim'}, 
                {c:'🐬', k:'dolphin flipper'}, {c:'🐳', k:'whale sea'}, {c:'🐋', k:'spouting whale'}, {c:'🦈', k:'shark jaws danger'}, {c:'🐊', k:'crocodile gator'}, {c:'🐅', k:'tiger full'}, 
                {c:'🐆', k:'leopard cheetah fast'}, {c:'🦓', k:'zebra stripes'}, {c:'🦍', k:'gorilla harambe monkey'}, {c:'🦧', k:'orangutan monkey ape'}, {c:'🐘', k:'elephant trunk big'}, {c:'🦛', k:'hippo water'}, 
                {c:'🦏', k:'rhino horn'}, {c:'🐪', k:'camel desert'}, {c:'🐫', k:'two-hump camel'}, {c:'🦒', k:'giraffe tall long neck'}, {c:'🦘', k:'kangaroo jump pouch'}, {c:'🐃', k:'water buffalo'}, 
                {c:'🐂', k:'ox bull'}, {c:'🐄', k:'bull cow'}, {c:'🐎', k:'horse full gallop'}, {c:'🐖', k:'pig full'}, {c:'🐏', k:'ram horns'}, {c:'🐑', k:'sheep wool'}, 
                {c:'🦙', k:'llama alpaca'}, {c:'🐐', k:'goat greatest'}, {c:'🦌', k:'deer buck'}, {c:'🐕', k:'dog full pet'}, {c:'🐩', k:'poodle dog fancy'}, {c:'🦮', k:'guide dog blind'}, 
                {c:'🐕‍🦺', k:'service dog help'}, {c:'🐈', k:'cat full pet'}, {c:'🐓', k:'rooster cock'}, {c:'🦃', k:'turkey thanksgiving'}, {c:'🦚', k:'peacock beautiful bird'}, {c:'🦜', k:'parrot talk bird'}, 
                {c:'🦢', k:'swan elegant'}, {c:'🦩', k:'flamingo pink'}, {c:'🕊️', k:'dove peace fly'}, {c:'🐇', k:'rabbit full bunny'}, {c:'🦝', k:'raccoon trash panda'}, {c:'🦨', k:'skunk smell stink'}, 
                {c:'🦡', k:'badger honey'}, {c:'🦦', k:'otter cute water'}, {c:'🦥', k:'sloth slow lazy'}, {c:'🐁', k:'mouse full'}, {c:'🐀', k:'rat snitch'}, {c:'🐿️', k:'chipmunk squirrel'}, 
                {c:'🦔', k:'hedgehog sonic cute'}, {c:'🐾', k:'paw prints dog cat pet'}, {c:'🐉', k:'dragon mythical'}, {c:'🐲', k:'dragon face fantasy'}, {c:'🌵', k:'cactus desert plant'}, {c:'🎄', k:'christmas tree xmas'}, 
                {c:'🌲', k:'evergreen pine wood'}, {c:'🌳', k:'deciduous tree wood nature'}, {c:'🌴', k:'palm beach tropical'}, {c:'🌱', k:'seedling plant grow'}, {c:'🌿', k:'herb leaf green weed'}, {c:'☘️', k:'shamrock clover'}, 
                {c:'🍀', k:'four leaf clover luck'}, {c:'🎍', k:'bamboo'}, {c:'🎋', k:'tanabata tree'}, {c:'🍃', k:'wind leaves fall'}, {c:'🍂', k:'fallen leaf autumn'}, {c:'🍁', k:'maple leaf canada autumn'}, 
                {c:'🍄', k:'mushroom shroom fungi'}, {c:'🌾', k:'sheaf wheat farming'}, {c:'💐', k:'bouquet flowers romantic'}, {c:'🌷', k:'tulip flower spring'}, {c:'🌹', k:'rose red love romantic'}, {c:'🥀', k:'wilted flower dead sad'}, 
                {c:'🌺', k:'hibiscus hawaii flower'}, {c:'🌸', k:'cherry blossom sakura pink'}, {c:'🌼', k:'blossom flower yellow'}, {c:'🌻', k:'sunflower happy summer'}, {c:'🌞', k:'sun face happy hot'}, {c:'🌝', k:'full sun smile'}, 
                {c:'🌛', k:'full moon face sleep'}, {c:'🌜', k:'last quarter moon'}, {c:'🌚', k:'new moon face dark'}, {c:'🌕', k:'full moon night'}, {c:'🌖', k:'waning gibbous'}, 
                {c:'🌗', k:'last quarter'}, {c:'🌘', k:'waning crescent'}, {c:'🌑', k:'new moon dark space'}, {c:'🌒', k:'waxing crescent'}, {c:'🌓', k:'first quarter'}, 
                {c:'🌔', k:'waxing gibbous'}, {c:'🌙', k:'crescent moon sleep night'}, {c:'🌎', k:'earth americas planet globe'}, {c:'🌍', k:'earth africa globe planet'}, {c:'🌏', k:'earth asia globe planet'}, 
                {c:'🪐', k:'planet saturn rings space'}, {c:'💫', k:'dizzy star shining'}, {c:'⭐', k:'star favorite shine'}, {c:'🌟', k:'glowing star magic shine'}, {c:'✨', k:'sparkles magic clean aesthetic'}, {c:'⚡', k:'zap lightning fast thunder'}, 
                {c:'☄️', k:'comet space rock'}, {c:'🔥', k:'fire flame hot lit fire'}, {c:'🌊', k:'wave ocean sea surf water'}, {c:'💧', k:'droplet water tear wet'}
            ]},
            { id: 'food', name: 'Food', icon: '🍔', emojis: [
                {c:'🍇', k:'grapes fruit'}, {c:'🍈', k:'melon cantaloupe'}, {c:'🍉', k:'watermelon summer'}, {c:'🍊', k:'tangerine orange'}, {c:'🍋', k:'lemon sour'}, {c:'🍌', k:'banana monkey fruit'}, 
                {c:'🍍', k:'pineapple tropical'}, {c:'🥭', k:'mango fruit tropical'}, {c:'🍎', k:'apple red fruit healthy'}, {c:'🍏', k:'apple green sour'}, {c:'🍐', k:'pear fruit'}, {c:'🍑', k:'peach butt juicy'}, 
                {c:'🍒', k:'cherries fruit red'}, {c:'🍓', k:'strawberry sweet berry'}, {c:'🥝', k:'kiwi fruit green'}, {c:'🍅', k:'tomato red veg'}, {c:'🥥', k:'coconut tropical island'}, {c:'🥑', k:'avocado guacamole toast healthy'}, 
                {c:'🍆', k:'eggplant vegetable'}, {c:'🥔', k:'potato spud'}, {c:'🥕', k:'carrot bugs bunny'}, {c:'🌽', k:'corn maize'}, {c:'🌶️', k:'hot pepper spicy chili'}, {c:'🥒', k:'cucumber pickle'}, 
                {c:'🥬', k:'leafy green lettuce cabbage'}, {c:'🥦', k:'broccoli vegetable healthy'}, {c:'🧄', k:'garlic flavor'}, {c:'🧅', k:'onion cry veg'}, {c:'🍄', k:'mushroom shroom'}, {c:'🥜', k:'peanuts nut allergy'}, 
                {c:'🌰', k:'chestnut nut brown'}, {c:'🍞', k:'bread loaf carb toast'}, {c:'🥐', k:'croissant french pastry'}, {c:'🥖', k:'baguette french bread'}, {c:'🥨', k:'pretzel snack'}, {c:'🥯', k:'bagel cream cheese'}, 
                {c:'🥞', k:'pancakes breakfast syrup'}, {c:'🧇', k:'waffle breakfast syrup'}, {c:'🧀', k:'cheese dairy slice'}, {c:'🍖', k:'meat bone bbq'}, {c:'🍗', k:'poultry drumstick chicken turkey'}, {c:'🥩', k:'steak meat beef bbq'}, 
                {c:'🥓', k:'bacon meat pork breakfast'}, {c:'🍔', k:'hamburger burger fast food'}, {c:'🍟', k:'fries french fries potato fast food'}, {c:'🍕', k:'pizza italian fast food slice'}, {c:'🌭', k:'hot dog sausage fast food'}, {c:'🥪', k:'sandwich lunch bread'}, 
                {c:'🌮', k:'taco mexican fast food'}, {c:'🌯', k:'burrito wrap mexican'}, {c:'🥙', k:'stuffed flatbread kebab pita'}, {c:'🧆', k:'falafel middle eastern'}, {c:'🥚', k:'egg breakfast white protein'}, {c:'🍳', k:'cooking frying pan egg breakfast'}, 
                {c:'🥘', k:'pan food paella dinner'}, {c:'🍲', k:'pot food soup stew warm'}, {c:'🥣', k:'bowl cereal soup breakfast'}, {c:'🥗', k:'salad healthy greens veg'}, {c:'🍿', k:'popcorn movie theater snack'}, {c:'🧈', k:'butter dairy slide'}, 
                {c:'🧂', k:'salt shaker spice flavor'}, {c:'🥫', k:'canned soup tin'}, {c:'🍱', k:'bento box japanese lunch'}, {c:'🍘', k:'cracker rice snack'}, {c:'🍙', k:'rice ball japanese snack'}, {c:'🍚', k:'cooked rice bowl asian'}, 
                {c:'🍛', k:'curry rice indian spicy'}, {c:'🍜', k:'noodle ramen soup asian warm'}, {c:'🍝', k:'spaghetti pasta italian noodle'}, {c:'🍠', k:'roasted potato sweet'}, {c:'🍢', k:'oden skewer snack'}, {c:'🍣', k:'sushi japanese raw fish'}, 
                {c:'🍤', k:'fried shrimp tempura'}, {c:'🍥', k:'fish cake swirl'}, {c:'🥮', k:'moon cake chinese festival'}, {c:'🍡', k:'dango sweet skewer'}, {c:'🥟', k:'dumpling potsticker asian'}, {c:'🥠', k:'fortune cookie chinese future'}, 
                {c:'🥡', k:'takeout box chinese food'}, {c:'🦀', k:'crab seafood'}, {c:'🦞', k:'lobster seafood red'}, {c:'🦐', k:'shrimp prawn seafood'}, {c:'🦑', k:'squid calamari'}, {c:'🦪', k:'oyster pearl seafood'}, 
                {c:'🍦', k:'ice cream soft serve cone dessert'}, {c:'🍧', k:'shaved ice dessert sweet'}, {c:'🍨', k:'ice cream scoop sundae dessert'}, {c:'🍩', k:'doughnut donut sweet pastry'}, {c:'🍪', k:'cookie chocolate chip dessert'}, {c:'🎂', k:'cake birthday celebrate party'}, 
                {c:'🍰', k:'shortcake slice dessert sweet'}, {c:'🧁', k:'cupcake sweet dessert bakery'}, {c:'🥧', k:'pie slice dessert'}, {c:'🍫', k:'chocolate bar sweet cocoa dessert'}, {c:'🍬', k:'candy sweet sugar'}, {c:'🍭', k:'lollipop sweet candy sugar'}, 
                {c:'🍮', k:'custard flan dessert sweet'}, {c:'🍯', k:'honey pot sweet bee'}, {c:'🍼', k:'baby bottle milk drink'}, {c:'🥛', k:'milk glass dairy drink'}, {c:'☕', k:'coffee hot tea mug cafe'}, {c:'🍵', k:'tea matcha green warm'}, 
                {c:'🍶', k:'sake bottle japanese drink'}, {c:'🍾', k:'champagne bottle pop celebrate party'}, {c:'🍷', k:'wine glass red alcohol drink'}, {c:'🍸', k:'cocktail glass martini alcohol drink'}, {c:'🍹', k:'tropical drink cocktail summer beach'}, {c:'🍺', k:'beer mug pint alcohol drink'}, 
                {c:'🍻', k:'beers clink cheers alcohol'}, {c:'🥂', k:'clinking glasses cheers celebrate toast'}, {c:'🥃', k:'whiskey glass shot alcohol liquor'}, {c:'🥤', k:'cup straw soda drink'}, {c:'🧃', k:'juice box drink apple'}, {c:'🧉', k:'mate drink tea herb'}, {c:'🧊', k:'ice cube cold freeze'}
            ]},
            { id: 'activity', name: 'Activity', icon: '⚽', emojis: [
                {c:'⚽', k:'soccer ball football sport'}, {c:'🏀', k:'basketball sport hoop'}, {c:'🏈', k:'football nfl sport american'}, {c:'⚾', k:'baseball sport bat'}, {c:'🥎', k:'softball sport ball'}, {c:'🎾', k:'tennis sport racket'}, 
                {c:'🏐', k:'volleyball sport net'}, {c:'🏉', k:'rugby sport ball'}, {c:'🥏', k:'frisbee throw sport'}, {c:'🎱', k:'pool 8 ball billiards'}, {c:'🪀', k:'yo-yo toy play'}, {c:'🏓', k:'ping pong table tennis paddle'}, 
                {c:'🏸', k:'badminton shuttlecock racket sport'}, {c:'🏒', k:'hockey stick puck ice sport'}, {c:'🏑', k:'field hockey stick sport'}, {c:'🥍', k:'lacrosse stick sport'}, {c:'🏏', k:'cricket bat ball sport'}, {c:'🥅', k:'goal net soccer hockey'}, 
                {c:'⛳', k:'golf hole flag putt'}, {c:'🪁', k:'kite fly wind toy'}, {c:'🏹', k:'archery bow arrow sport'}, {c:'🎣', k:'fishing pole catch water'}, {c:'🤿', k:'diving mask snorkel water swim'}, {c:'🥊', k:'boxing glove fight punch sport'}, 
                {c:'🥋', k:'martial arts judo karate uniform'}, {c:'🎽', k:'shirt running marathon'}, {c:'🛹', k:'skateboard skate sport trick'}, {c:'🛼', k:'roller skate rink retro'}, {c:'🛷', k:'sled snow winter'}, {c:'⛸️', k:'ice skate winter sport blade'}, 
                {c:'🥌', k:'curling stone winter sport'}, {c:'🎿', k:'ski snow winter sport'}, {c:'⛷️', k:'skier snow winter sport'}, {c:'🏂', k:'snowboarder snow winter sport'}, {c:'🪂', k:'parachute skydive fall fly'}, {c:'🏋️', k:'weight lifting gym strong workout'}, 
                {c:'🤼', k:'wrestling fight match'}, {c:'🤸', k:'cartwheel gymnastics flip'}, {c:'⛹️', k:'bouncing ball basketball play'}, {c:'🤺', k:'fencing sword sport'}, {c:'🤾', k:'handball throw sport'}, {c:'🏌️', k:'golfing swing sport putt'}, 
                {c:'🏇', k:'horse racing jockey sport'}, {c:'🧘', k:'yoga meditate zen relax'}, {c:'🏄', k:'surfing wave ocean beach board'}, {c:'🏊', k:'swimming pool water sport'}, {c:'🤽', k:'water polo sport pool'}, {c:'🚣', k:'rowing boat water crew'}, 
                {c:'🧗', k:'climbing rock mountain'}, {c:'🚵', k:'biking mountain bike cycle'}, {c:'🚴', k:'cyclist bike ride sport'}, {c:'🏆', k:'trophy win award champion first'}, {c:'🥇', k:'1st place medal gold win'}, {c:'🥈', k:'2nd place medal silver'}, {c:'🥉', k:'3rd place medal bronze'}, 
                {c:'🏅', k:'medal award ribbon win'}, {c:'🎖️', k:'military medal honor award'}, {c:'🎗️', k:'reminder ribbon awareness'}, {c:'🎫', k:'ticket admit pass event'}, {c:'🎟️', k:'admission tickets movie show'}, {c:'🎪', k:'circus tent show event'}, 
                {c:'🤹', k:'juggling trick circus play'}, {c:'🎭', k:'performing arts theater drama masks'}, {c:'🎨', k:'art palette paint draw creative'}, {c:'🎬', k:'clapper board movie film action'}, {c:'🎤', k:'microphone sing karaoke mic'}, {c:'🎧', k:'headphone music listen dj'}, 
                {c:'🎼', k:'score music sheet treble'}, {c:'🎹', k:'musical keyboard piano play'}, {c:'🥁', k:'drum beat instrument music'}, {c:'🎷', k:'sax saxophone jazz instrument'}, {c:'🎺', k:'trumpet brass instrument'}, {c:'🎸', k:'guitar rock instrument band'}, 
                {c:'🪕', k:'banjo music instrument country'}, {c:'🎻', k:'violin strings classical instrument'}, {c:'🎲', k:'game die dice random luck casino'}, {c:'♟️', k:'pawn chess strategy board game'}, {c:'🎯', k:'bullseye dart target focus aim'}, {c:'🎳', k:'bowling pin strike alley'}, 
                {c:'🎮', k:'game controller video games ps xbox'}, {c:'🎰', k:'slot machine casino gamble 777'}, {c:'🧩', k:'puzzle piece solve logic'}
            ]},
            { id: 'objects', name: 'Objects', icon: '💡', emojis: [
                {c:'👟', k:'shoe running sneaker sports foot'}, {c:'👞', k:'shoe men leather fancy formal'}, {c:'🥾', k:'hiking boot outdoor shoe walk'}, {c:'🥿', k:'flat shoe ballet slip on'}, {c:'👠', k:'high heel stiletto fashion shoe'}, 
                {c:'👡', k:'sandal summer shoe foot'}, {c:'🩰', k:'ballet shoes dance pointe'}, {c:'👢', k:'boot winter shoe fashion'}, {c:'🕶️', k:'sunglasses cool shades sun'}, {c:'👓', k:'glasses nerd see sight read'}, {c:'🥽', k:'goggles swim protect eye'}, 
                {c:'🥼', k:'lab coat doctor science white'}, {c:'🦺', k:'safety vest orange construction guard'}, {c:'👔', k:'tie suit formal business office'}, {c:'👕', k:'t-shirt shirt clothes casual'}, {c:'👖', k:'jeans pants denim clothes'}, {c:'🧣', k:'scarf winter warm neck'}, 
                {c:'🧤', k:'gloves winter warm hands cold'}, {c:'🧥', k:'coat jacket winter warm clothes'}, {c:'🧦', k:'socks feet warm clothes'}, {c:'👗', k:'dress fashion girl clothes'}, {c:'👘', k:'kimono japan traditional dress'}, {c:'🥻', k:'sari india dress fashion'}, 
                {c:'🩱', k:'swimsuit bathing suit beach summer'}, {c:'🩲', k:'briefs underwear pants'}, {c:'🩳', k:'shorts pants summer beach'}, {c:'👙', k:'bikini swimsuit beach summer hot'}, {c:'👚', k:'clothes blouse shirt top'}, {c:'👛', k:'purse coin bag money wallet'}, 
                {c:'👜', k:'handbag fashion bag lady'}, {c:'👝', k:'pouch bag makeup zip'}, {c:'🛍️', k:'shopping bags buy store mall'}, {c:'🎒', k:'backpack school travel bag bag'}, {c:'👑', k:'crown king queen royal prince'}, {c:'👒', k:'hat sun lady fashion beach'}, 
                {c:'🎩', k:'top hat magic fancy gentleman'}, {c:'🎓', k:'grad cap school college smart diploma'}, {c:'🧢', k:'cap baseball hat casual'}, {c:'⛑️', k:'helmet rescue safety red cross'}, {c:'📿', k:'beads prayer religion rosary'}, {c:'💄', k:'lipstick makeup beauty kiss fashion'}, 
                {c:'💍', k:'ring diamond engagement marry propose'}, {c:'💎', k:'gem diamond jewel shiny rich'}, {c:'⌚', k:'watch time clock wrist apple'}, {c:'📱', k:'mobile phone call iphone app'}, {c:'💻', k:'computer laptop mac pc tech code'}, {c:'⌨️', k:'keyboard type computer tech'}, 
                {c:'🖥️', k:'desktop computer pc mac monitor'}, {c:'🖨️', k:'printer paper ink tech office'}, {c:'🖱️', k:'mouse computer tech click scroll'}, {c:'🖲️', k:'trackball mouse computer tech'}, {c:'🕹️', k:'joystick game play arcade retro'}, {c:'🗜️', k:'clamp tool vice squeeze press'}, 
                {c:'💽', k:'minidisc music retro disc'}, {c:'💾', k:'floppy disk save retro computer tech'}, {c:'💿', k:'cd disc music compact software'}, {c:'📀', k:'dvd disc movie video gold'}, {c:'📼', k:'vhs tape video retro movie cassette'}, {c:'📷', k:'camera photo picture shoot lens'}, 
                {c:'📸', k:'flash camera photo snap flash'}, {c:'📹', k:'video camera record tape shoot'}, {c:'🎥', k:'movie camera film cinema video tape'}, {c:'📽️', k:'projector movie film cinema reel'}, {c:'🎞️', k:'film frames movie cinema picture'}, {c:'📞', k:'telephone call phone dial ring'}, 
                {c:'☎️', k:'phone telephone red classic dial call'}, {c:'📟', k:'pager retro tech beep message'}, {c:'📠', k:'fax machine print office paper'}, {c:'📺', k:'tv television watch show video screen'}, {c:'📻', k:'radio listen music broadcast retro news'}, {c:'🎙️', k:'mic microphone podcast sing voice audio'}, 
                {c:'🎚️', k:'level slider audio mix volume studio'}, {c:'🎛️', k:'knobs audio mix control dial studio'}, {c:'🧭', k:'compass navigate north direction map'}, {c:'⏱️', k:'stopwatch time track race run fast'}, {c:'⏲️', k:'timer clock kitchen cook count wait'}, {c:'⏰', k:'clock alarm time wake morning bell'}, 
                {c:'🕰️', k:'mantelpiece clock vintage time old wood'}, {c:'⌛', k:'hourglass time sand wait slow done'}, {c:'⏳', k:'sand hourglass time wait flow ticking'}, {c:'📡', k:'satellite dish space signal radar broadcast'}, {c:'🔋', k:'battery power charge energy low full'}, {c:'🔌', k:'plug power outlet cord electric wire'}, 
                {c:'💡', k:'bulb light idea bright genius electric'}, {c:'🔦', k:'flashlight light dark see beam electric'}, {c:'🕯️', k:'candle wax light fire dark flame scent'}, {c:'🪔', k:'diya lamp oil light india dipawali fest'}, {c:'🧱', k:'brick wall build red block house'}, {c:'🧯', k:'extinguisher fire red safety emergency put out'}, 
                {c:'🛢️', k:'oil drum barrel fuel gas slick spill'}, {c:'💸', k:'money fly cash spend rich pay loss'}, {c:'💵', k:'dollar bill money cash buck green pay'}, {c:'💴', k:'yen money japan bill cash currency pay'}, {c:'💶', k:'euro money europe bill cash currency pay'}, {c:'💷', k:'pound money uk british bill cash pay'}, 
                {c:'💰', k:'moneybag rich wealth cash gold stash bag'}, {c:'💳', k:'credit card pay swipe plastic money buy'}, {c:'⚖️', k:'scale balance law justice court equal judge'}, {c:'🧰', k:'toolbox box fix build repair work mechanic'}, {c:'🔧', k:'wrench tool fix build tighten mechanic hardware'}, {c:'🔨', k:'hammer tool fix build hit nail smash hardware'}, 
                {c:'⚒️', k:'hammer pick tool mine build work fix pickaxe'}, {c:'🛠️', k:'tools wrench hammer fix repair build mechanic'}, {c:'⛏️', k:'pick pickaxe tool mine dig rock break stone'}, {c:'🔩', k:'bolt nut screw tool fix metal hardware build'}, {c:'⚙️', k:'gear cog machine fix mechanic settings engine spin'}, {c:'⛓️', k:'chains metal link bind heavy steel restrict prison'}, 
                {c:'🔫', k:'pistol gun weapon shoot bang water squirt toy'}, {c:'💣', k:'bomb explode blast boom kaboom fuse danger explosive'}, {c:'🧨', k:'firecracker explode boom spark bang fuse pop new year'}, {c:'🪓', k:'axe hatchet tool chop wood cut tree lumberjack split'}, {c:'🔪', k:'knife cut slice stab sharp kitchen cook chef weapon'}, {c:'🗡️', k:'dagger knife sword cut stab weapon sharp combat fight'}, 
                {c:'⚔️', k:'swords cross battle fight weapon knight medieval war duel'}, {c:'🛡️', k:'shield protect defend block armor knight battle guard save'}, {c:'🚬', k:'smoking cigarette puff tobacco smoke ash habit unhealthy drag'}, {c:'⚰️', k:'coffin dead bury funeral death grave vampire dracula box'}, {c:'⚱️', k:'urn ash dead jar pot vase funeral bury creamation vessel'}, {c:'🏺', k:'amphora vase pot jar ancient greek rome clay vessel jug'}, 
                {c:'🔮', k:'crystal ball future magic fortune teller predict purple glass psychic'}, {c:'📿', k:'beads prayer necklace rosary religion spiritual chain meditate god'}, {c:'🧿', k:'nazar amulet evil eye protect charm blue greek turkish lucky'}, {c:'💈', k:'barber pole hair cut salon shave stripe red blue white'}, {c:'⚗️', k:'alembic chemistry science flask lab potion distill glass brew beaker'}, {c:'🔭', k:'telescope star space astronomy glass look see far lens zoom'}, 
                {c:'🔬', k:'microscope science lab zoom look small biology cell tech tool'}, {c:'🕳️', k:'hole black empty dark drop fall pit abyss space deep'}, {c:'💊', k:'pill medicine drug sick heal health doctor pharmacy cure treat'}, {c:'💉', k:'syringe needle shot drug doctor sick blood heal cure hospital'}, {c:'🩸', k:'blood drop red fluid hurt bleed cut period vamp heal'}, {c:'🩹', k:'bandage bandaid heal hurt cut scrape stick stick patch fix'}, 
                {c:'🩺', k:'stethoscope doctor listen heart beat chest health sick clinic pulse'}, {c:'🧬', k:'dna spiral helix gene science biology code life strand trait'}, {c:'🚪', k:'door wood open close enter exit room home house knob'}, {c:'🛏️', k:'bed sleep rest lie night room home house mattress comfort'}, {c:'🛋️', k:'couch sofa sit rest room furniture home lounge house cushion'}, {c:'🪑', k:'chair sit rest wood furniture seat room home house table'}, 
                {c:'🚽', k:'toilet bathroom washroom flush pee poop pot seat water home'}, {c:'🚿', k:'shower wash bathroom water clean soap wet home bathe washroom'}, {c:'🛁', k:'bath tub wash soap water clean wet bubble bathroom home'}, {c:'🪒', k:'razor shave cut hair sharp bathroom tool barber blade groom'}, {c:'🧴', k:'lotion cream soap bottle squeeze smooth rub skin sun block'}, {c:'🧷', k:'pin safety needle tack attach hold metal secure stick fasten'}, 
                {c:'🧹', k:'broom sweep clean brush floor dust house tidy witch wood'}, {c:'🧺', k:'basket laundry carry picnic weave wood clothes home carry store'}, {c:'🧻', k:'paper roll toilet wipe bathroom tissue wipe sheet clean soft'}, {c:'🧼', k:'soap wash clean bubble bathroom hand froth suds scrub fresh'}, {c:'🧽', k:'sponge wash clean wipe scrub absorb dish kitchen soft yellow'}, {c:'🛒', k:'cart shop buy grocery store supermarket wheel market buy push'}
            ]},
            { id: 'symbols', name: 'Symbols', icon: '❤️', emojis: [
                {c:'❤️', k:'heart red love like passion romance true'}, {c:'🧡', k:'orange heart love warm friend'}, {c:'💛', k:'yellow heart love happy sun friend'}, {c:'💚', k:'green heart love nature envy money earth'}, {c:'💙', k:'blue heart love water cold sad sad'}, 
                {c:'💜', k:'purple heart love magic royal'}, {c:'🖤', k:'black heart love dark goth sad emotion'}, {c:'🤍', k:'white heart love pure clean snow peace'}, {c:'🤎', k:'brown heart love chocolate wood earth'}, {c:'💔', k:'broken heart love sad split tear ache'}, 
                {c:'❣️', k:'exclamation heart red love point mark heavy'}, {c:'💕', k:'two hearts love romance pair sweet double'}, {c:'💞', k:'revolving hearts love orbit spin sweet moving'}, {c:'💓', k:'beating heart love pulse beat alive throb'}, {c:'💗', k:'growing heart love big beat swell expand'}, 
                {c:'💖', k:'sparkling heart love shine bright star magic'}, {c:'💘', k:'arrow heart love cupid hit strike target'}, {c:'💝', k:'ribbon heart love gift wrap box present'}, {c:'💟', k:'decoration heart love box purple frame stamp'}, {c:'☮️', k:'peace sign symbol hippie calm harmony stop war'}, 
                {c:'✝️', k:'cross religion christian jesus god faith pray holy'}, {c:'☪️', k:'star crescent islam religion muslim moon faith pray'}, {c:'🕉️', k:'om hinduism religion symbol god spirit faith india'}, {c:'☸️', k:'dharma wheel buddhism religion symbol faith path karma'}, {c:'✡️', k:'star david judaism religion jewish hexagram faith israel'}, 
                {c:'🔯', k:'six star purple hexagram magic pattern symbol decor'}, {c:'🕎', k:'menorah judaism religion light candle hanukkah jewish god'}, {c:'☯️', k:'yin yang taoism religion balance zen peace harmony symbol'}, {c:'☦️', k:'orthodox cross religion christian god faith pray symbol'}, {c:'🛐', k:'worship pray religion sign faith kneel god pray bow'}, 
                {c:'⛎', k:'ophiuchus zodiac sign astrology star snake symbol space'}, {c:'♈', k:'aries zodiac sign ram star astrology horoscope space symbol'}, {c:'♉', k:'taurus zodiac sign bull star astrology horoscope space symbol'}, {c:'♊', k:'gemini zodiac sign twins star astrology horoscope space symbol'}, {c:'♋', k:'cancer zodiac sign crab star astrology horoscope space symbol'}, 
                {c:'♌', k:'leo zodiac sign lion star astrology horoscope space symbol'}, {c:'♍', k:'virgo zodiac sign maiden star astrology horoscope space symbol'}, {c:'♎', k:'libra zodiac sign scales star astrology horoscope space symbol'}, {c:'♏', k:'scorpio zodiac sign scorpion star astrology horoscope space symbol'}, {c:'♐', k:'sagittarius zodiac sign archer star astrology horoscope space symbol'}, 
                {c:'♑', k:'capricorn zodiac sign goat star astrology horoscope space symbol'}, {c:'♒', k:'aquarius zodiac sign water bearer star astrology horoscope space symbol'}, {c:'♓', k:'pisces zodiac sign fish star astrology horoscope space symbol'}, {c:'🆔', k:'id identification badge card recognize sign name symbol face'}, {c:'⚛️', k:'atom science physics energy biology chemistry atom power nuclear'}, 
                {c:'🉑', k:'accept agree ok yes allow approve sign symbol pass'}, {c:'☢️', k:'radioactive hazard danger warn nuclear toxic poison bad symbol'}, {c:'☣️', k:'biohazard danger hazard toxic poison bad warn death symbol'}, {c:'📴', k:'mobile off phone silent turn off no phone quiet cell'}, {c:'📳', k:'vibration mode phone shake silent ring mobile turn on buzz'}, 
                {c:'🈶', k:'have possess own rich hold get claim sign chinese mark'}, {c:'🈚', k:'no none empty void hollow lack nil sign chinese mark'}, {c:'🈸', k:'application form ask plead beg request sign chinese symbol'}, {c:'🈺', k:'open business work run start go sign chinese store shop'}, {c:'🈷️', k:'month moon time date calendar sign chinese period sign symbol'}, 
                {c:'✴️', k:'eight star point shape shine edge symbol decor mark sign'}, {c:'🆚', k:'vs versus against combat fight battle match game score box'}, {c:'💮', k:'white flower stamp seal sign mark good well done japan print'}, {c:'🉐', k:'advantage benefit win gain profit get sign chinese earn deal'}, {c:'㊙️', k:'secret hide unknown private top lock sign chinese sign mark'}, 
                {c:'㊗️', k:'congrats praise happy win bless party sign chinese wish gift'}, {c:'🈴', k:'match combine join fit together sign chinese merge hook unite'}, {c:'🈵', k:'full filled capacity pack complete sign chinese whole round done'}, {c:'🈹', k:'discount sale price cut lower save sign chinese deal retail'}, {c:'🈲', k:'prohibit ban stop no halt forbid sign chinese law stop warn'}, 
                {c:'🅰️', k:'a letter alphabet blood type first score letter red symbol mark'}, {c:'🅱️', k:'b letter alphabet blood type score second letter red symbol mark'}, {c:'🆎', k:'ab letter alphabet blood type rare red symbol sign mark blood'}, {c:'🆑', k:'cl clear clean wipe delete back clear red symbol mark blank'}, {c:'🅾️', k:'o letter alphabet blood type zero circle letter red symbol mark blood'}, 
                {c:'🆘', k:'sos help save danger emergency distress red alert mark warn'}, {c:'❌', k:'cross mark x no wrong stop incorrect error red false fail'}, {c:'⭕', k:'circle mark o round correct yes true hollow red ring hollow'}, {c:'🛑', k:'stop sign halt danger warning alert block red stop sign wait'}, {c:'⛔', k:'no entry sign stop danger block forbidden warn red stop ban'}, 
                {c:'📛', k:'name badge label tag hello indentify flame red shield title'}, {c:'🚫', k:'prohibited stop ban no halt restrict block sign symbol forbid'}, {c:'💯', k:'hundred score percent perfect 100 grade full test pass win best'}, {c:'💢', k:'anger angry mad symbol pop vein explode rage blast emotion tick'}, {c:'♨️', k:'hot springs heat warm water steam bath relax boil boil sign symbol'}, 
                {c:'🚷', k:'no pedestrians walk stop ban street sign forbid sign warn block symbol'}, {c:'🚯', k:'no litter trash garbage stop ban clean waste sign warn block symbol'}, {c:'🚳', k:'no bikes bicycle stop ban road sign path forbid warn block symbol'}, {c:'🚱', k:'no water drink stop ban hazard toxic bad sign warn block symbol'}, {c:'🔞', k:'under 18 age limit minor adult ban stop forbid sign warn block symbol'}, 
                {c:'📵', k:'no phones cell stop ban quiet device mute sign warn block symbol'}, {c:'🚭', k:'no smoking cigarette stop ban clear sign warn block symbol health'}, {c:'❗', k:'exclamation point mark punctuation alert red danger warning yell shout'}, {c:'❕', k:'white exclamation point mark punctuation alert grey plain shout mark'}, {c:'❓', k:'question point mark punctuation red ask huh wtf what query doubt'}, 
                {c:'❔', k:'white question point mark punctuation grey ask huh what query plain'}, {c:'‼️', k:'double exclamation point mark punctuation red alert danger warning shout fast'}, {c:'⁉️', k:'interrobang question exclamation mark alert ask wtf shock surprise punct'}, {c:'🔅', k:'dim brightness sun low light down gear down less setting control'}, {c:'🔆', k:'bright brightness sun high light up gear up more setting shine'}, 
                {c:'〽️', k:'part alternation mark line yellow wave up down trace symbol note mark'}, {c:'⚠️', k:'warning triangle danger alert sign hazard caution stop beware sign'}, {c:'🚸', k:'children crossing walk road sign kid school caution warn sign path'}, {c:'🔱', k:'trident weapon pitchfork poseidon sea fork gold symbol tool prong'}, {c:'⚜️', k:'fleur de lis lily gold scout sign french symbol flower rank emblem'}, 
                {c:'🔰', k:'beginner sign start learning new leaf japan green yellow shape symbol'}, {c:'♻️', k:'recycle sign green save earth eco friendly repeat loop paper plastic'}, {c:'✅', k:'check mark correct yes green true pass approved done tick right ok'}, {c:'🈯', k:'reserved seat hold keep space open sign mark chinese sign label box'}, {c:'💹', k:'chart green up line graph trend stock money rise grow arrow eco'}, 
                {c:'❇️', k:'sparkle green flash shape diamond mark sign star blink blink decor'}, {c:'✳️', k:'asterisk star point eight green star shape mark sign note multi math'}, {c:'❎', k:'cross box mark x green false error wrong deny button ban stop close'}, {c:'🌐', k:'globe grid earth world web global net www map sphere internet link'}, {c:'💠', k:'diamond shape blue gem crystal point frame dot decor pattern shape'}, 
                {c:'Ⓜ️', k:'m letter alphabet blue circle metro subway train sign mark initial'}, {c:'🌀', k:'cyclone storm hurricane blue wind weather tornado swirl spin twist dizzy'}, {c:'💤', k:'zzz sleep tired snore rest exhausted blue bed dream nap night snore'}, {c:'🏧', k:'atm cash money bank machine draw blue sign dollar finance withdraw'}, {c:'🚾', k:'wc toilet bathroom washroom blue sign pee pot rest public water'}, 
                {c:'♿', k:'wheelchair blue handicap disabled walk aid sign access park roll sit'}, {c:'🅿️', k:'parking car letter p blue sign street lot spot space block leave'}, {c:'🈳', k:'vacancy empty free available room space sign mark chinese box void'}, {c:'🈂️', k:'service free provided help charge box sign mark japanese box gratis'}, {c:'🛂', k:'passport control travel check border identity security blue sign stamp pass'}, 
                {c:'🛃', k:'customs border travel bag check box blue sign tax duty luggage pass'}, {c:'🛄', k:'baggage claim luggage bag travel belt blue sign case take pickup'}, {c:'🛅', k:'locker luggage bag key safe keep store travel blue sign hide lock'}, {c:'🚹', k:'mens room bathroom toilet man male sign blue wash boy pee pee'}, {c:'🚺', k:'womens room bathroom toilet woman female lady sign wash girl pee pee'}, 
                {c:'🚼', k:'baby sign bathroom change washroom kid child infant care blue safe'}, {c:'🚻', k:'restroom toilet bathroom male female man woman sign blue wash men'}, {c:'🚮', k:'litter bin sign trash garbage clean throw recycle blue pot drop drop'}, {c:'🎦', k:'cinema film movie theater play watch show ticket sign tape blue cam'}, {c:'📶', k:'signal strength bar phone wifi connection network tower blue connect cell'}, 
                {c:'🈁', k:'koko here this place direction box sign mark japanese box map spot'}, {c:'🔣', k:'symbols sign input math char type ampersand character alt shift type'}, {c:'ℹ️', k:'info information letter i help sign guide blue mark query detail tell'}, {c:'🔤', k:'abc lowercase letter alphabet text type input string char type shift'}, {c:'🔡', k:'abcd lowercase letter alphabet text type input string char type shift'}, 
                {c:'🔠', k:'capital uppercase letter alphabet text type input string char shift caps'}, {c:'🆖', k:'ng no good bad fail flop error sign mark box block red stop deny'}, {c:'🆗', k:'ok okay yes fine agree approve pass clear sign blue mark word box'}, {c:'🆙', k:'up word point high sky rise raise increase top blue sign level lift'}, {c:'🆒', k:'cool word sign slang nice blue chill vibe great mark word text font'}, 
                {c:'🆕', k:'new word sign recent fresh release start box blue mark box word font'}, {c:'🆓', k:'free word sign open no charge gratis gratis box blue mark save text'}, {c:'0️⃣', k:'zero number digit 0 box zero sign rank count null zero math blue'}, {c:'1️⃣', k:'one number digit 1 box one sign rank count first top math blue'}, {c:'2️⃣', k:'two number digit 2 box two sign rank count second pair math blue'}, 
                {c:'3️⃣', k:'three number digit 3 box three sign rank count third trio math blue'}, {c:'4️⃣', k:'four number digit 4 box four sign rank count forth quad math blue'}, {c:'5️⃣', k:'five number digit 5 box five sign rank count fifth quint math blue'}, {c:'6️⃣', k:'six number digit 6 box six sign rank count sixth hex math blue'}, {c:'7️⃣', k:'seven number digit 7 box seven sign rank count lucky math blue'}, 
                {c:'8️⃣', k:'eight number digit 8 box eight sign rank count oct math blue'}, {c:'9️⃣', k:'nine number digit 9 box nine sign rank count math blue'}, {c:'🔟', k:'ten number digit 10 box ten sign rank count math blue perfect full'}, {c:'🔢', k:'numbers sign input math char type digit count hash grid 123 sum type'}, {c:'#️⃣', k:'hash tag pound key sign sharp grid number box type string id rank'}, 
                {c:'*️⃣', k:'star asterisk point sign key type box star point multi times math'}, {c:'⏏️', k:'eject play button remove quit out up pop eject push disc drive arrow'}, {c:'▶️', k:'play arrow right fast forward media go start action start tape drive'}, {c:'⏸️', k:'pause two lines media stop halt freeze wait rest break media hold break'}, {c:'⏯️', k:'play pause arrow right media start stop flip toggle switch action break'}, 
                {c:'⏹️', k:'stop square halt end quit media finish stop red wait no hold end'}, {c:'⏺️', k:'record circle round media tape store keep red camera tape hit mic'}, {c:'⏭️', k:'next forward arrow skip fast advance media skip jump hop go speed next'}, {c:'⏮️', k:'prev backward arrow skip rewind media back turn jump rear slow last'}, {c:'⏩', k:'fast fwd double arrow right skip media speed zoom rush run go next'}, 
                {c:'⏪', k:'rewind double arrow left skip media reverse back return rear look past'}, {c:'⏫', k:'fast up double arrow up top speed rise jump ascend lift rise peak'}, {c:'⏬', k:'fast down double arrow down bottom speed drop fall sink low drop'}, {c:'◀️', k:'reverse arrow left back return rear look left point direction left go'}, {c:'🔼', k:'up arrow triangle point top high ceiling lift sky roof rise peak go'}, 
                {c:'🔽', k:'down arrow triangle point bottom low floor drop sink ground down fall'}, {c:'➡️', k:'right arrow point direction right go next lead straight path road turn'}, {c:'⬅️', k:'left arrow point direction left go back turn return side cross way shift'}, {c:'⬆️', k:'up arrow point direction sky top rise ascend high lift sky jump top'}, {c:'⬇️', k:'down arrow point direction floor low drop sink ground depth dive bottom'}, 
                {c:'↗️', k:'up right arrow point direction angle rise growth positive angle pitch lean'}, {c:'↘️', k:'down right arrow point direction angle drop fall sink angle dive loss'}, {c:'↙️', k:'down left arrow point direction angle return fall back back tilt sink angle'}, {c:'↖️', k:'up left arrow point direction angle rise back retreat angle tilt bank angle'}, {c:'↕️', k:'up down arrow double point direction vertical height tall long rise pan drop'}, 
                {c:'↔️', k:'left right arrow double point direction horizontal wide span pan slide broad'}, {c:'🔄', k:'counterclockwise arrow circle spin turn flip reload sync cycle round loop refresh'}, {c:'↪️', k:'right curv arrow point direction bend turn right loop snake wrap twist'}, {c:'↩️', k:'left curv arrow point direction bend turn left return loop bounce curve wrap'}, {c:'⤴️', k:'curv up arrow point direction rise sweep jump curve wave arc loft swoop'}, 
                {c:'⤵️', k:'curv down arrow point direction drop sink fall dip arc drop scoop swing'}, {c:'🔀', k:'shuffle media arrows mix swap random twist interlace thread twine media'}, {c:'🔁', k:'repeat media arrows cycle round loop round sync again replay refresh renew'}, {c:'🔂', k:'repeat one media arrows cycle round loop one track single replay loop solo'}
            ]},
            { id: 'flags', name: 'Flags', icon: '🏳️', emojis: [
                {c:'🏳️', k:'white flag surrender peace truce blank clear color wind'}, {c:'🏳️‍🌈', k:'rainbow flag pride lgbtq color gay parade love peace'}, {c:'🏳️‍⚧️', k:'transgender flag trans lgbtq pride rights color blue pink'}, {c:'🏴', k:'black flag pirate dark protest shadow color wave bold empty'}, 
                {c:'🏁', k:'checkered flag finish race win nascar sport track end square line'}, {c:'🚩', k:'triangular flag red danger alert mark point spot wind warning'}, {c:'🎌', k:'crossed flags japan holiday celebrate event cheer festival wave parade'}, {c:'🏴‍☠️', k:'pirate flag jolly roger skull crossbones death danger sea steal boat'}, 
                {c:'🇺🇳', k:'un flag united nations global world peace earth union group'}, {c:'🇦🇫', k:'afghanistan flag nation country middle east kaboul asian asia'}, {c:'🇦🇱', k:'albania flag nation country europe balkan balkan eagle red'}, {c:'🇩🇿', k:'algeria flag nation country africa north arab star crescent green'}, 
                {c:'🇦🇸', k:'american samoa flag nation country island oceania pacific eagle'}, {c:'🇦🇩', k:'andorra flag nation country europe iberia spain french shield'}, {c:'🇦🇴', k:'angola flag nation country africa machete gear star red black'}, {c:'🇦🇮', k:'anguilla flag nation country caribbean island uk union blue shield'}, 
                {c:'🇦🇶', k:'antarctica flag nation continent south pole cold ice map white blue'}, {c:'🇦🇬', k:'antigua flag nation country caribbean sun island sand sea v'}, {c:'🇦🇷', k:'argentina flag nation country south america sun blue white messi'}, {c:'🇦🇲', k:'armenia flag nation country asia europe caucasus red blue orange'}, 
                {c:'🇦🇼', k:'aruba flag nation country caribbean island star blue yellow'}, {c:'🇦🇺', k:'australia flag nation country oceania down under star uk blue'}, {c:'🇦🇹', k:'austria flag nation country europe red white alps'}, {c:'🇦🇿', k:'azerbaijan flag nation country caucasus asia star crescent fire'}, 
                {c:'🇧🇸', k:'bahamas flag nation country caribbean island black yellow blue'}, {c:'🇧🇭', k:'bahrain flag nation country middle east arab red white'}, {c:'🇧🇩', k:'bangladesh flag nation country asia sun green red circle'}, {c:'🇧🇧', k:'barbados flag nation country caribbean trident island blue yellow'}, 
                {c:'🇧🇾', k:'belarus flag nation country europe red green pattern'}, {c:'🇧🇪', k:'belgium flag nation country europe black yellow red waffle'}, {c:'🇧🇿', k:'belize flag nation country central america shield blue red'}, {c:'🇧🇯', k:'benin flag nation country africa green yellow red'}, 
                {c:'🇧🇲', k:'bermuda flag nation country caribbean island uk red shield'}, {c:'🇧🇹', k:'bhutan flag nation country asia dragon orange yellow himalaya'}, {c:'🇧🇴', k:'bolivia flag nation country south america red yellow green shield'}, {c:'🇧🇦', k:'bosnia flag nation country europe balkan star yellow blue'}, 
                {c:'🇧🇼', k:'botswana flag nation country africa light blue black white'}, {c:'🇧🇷', k:'brazil flag nation country south america green yellow blue star soccer'}, {c:'🇮🇴', k:'british indian ocean flag territory island uk blue wave palm crown'}, {c:'🇻🇬', k:'british virgin islands flag territory caribbean uk blue shield'}, 
                {c:'🇧🇳', k:'brunei flag nation country asia yellow black white crest'}, {c:'🇧🇬', k:'bulgaria flag nation country europe balkan white green red'}, {c:'🇧🇫', k:'burkina faso flag nation country africa red green star pan'}, {c:'🇧🇮', k:'burundi flag nation country africa star green red white cross'}, 
                {c:'🇰🇭', k:'cambodia flag nation country asia angkor wat blue red'}, {c:'🇨🇲', k:'cameroon flag nation country africa green red yellow star'}, {c:'🇨🇦', k:'canada flag nation country north america maple leaf red white'}, {c:'🇮🇨', k:'canary islands flag territory spain africa island white blue yellow dogs'}, 
                {c:'🇨🇻', k:'cape verde flag nation country africa island blue white red stars'}, {c:'🇧🇶', k:'caribbean netherlands flag territory island star blue red white'}, {c:'🇰🇾', k:'cayman islands flag territory caribbean uk blue shield'}, {c:'🇨🇫', k:'central african republic flag nation country africa blue white green yellow red star'}, 
                {c:'🇹🇩', k:'chad flag nation country africa blue yellow red'}, {c:'🇨🇱', k:'chile flag nation country south america star blue white red'}, {c:'🇨🇳', k:'china flag nation country asia star red yellow'}, {c:'🇨🇽', k:'christmas island flag territory oceania bird star green blue yellow'}, 
                {c:'🇨🇨', k:'cocos islands flag territory oceania palm star moon green yellow'}, {c:'🇨🇴', k:'colombia flag nation country south america yellow blue red'}, {c:'🇰🇲', k:'comoros flag nation country africa island moon star yellow white red blue'}, {c:'🇨🇬', k:'congo brazzaville flag nation country africa green yellow red line'}, 
                {c:'🇨🇩', k:'congo kinshasa flag nation country africa blue star red yellow drc'}, {c:'🇨🇰', k:'cook islands flag territory oceania star circle blue uk'}, {c:'🇨🇷', k:'costa rica flag nation country central america blue white red shield'}, {c:'🇨🇮', k:'cote divoire flag nation country africa ivory coast orange white green'}, 
                {c:'🇭🇷', k:'croatia flag nation country europe balkan red white blue shield checker'}, {c:'🇨🇺', k:'cuba flag nation country caribbean star blue white red triangle'}, {c:'🇨🇼', k:'curacao flag territory caribbean star blue yellow island'}, {c:'🇨🇾', k:'cyprus flag nation country europe mediterranean map olive orange white'}, 
                {c:'🇨🇿', k:'czechia flag nation country europe czech republic blue white red triangle'}, {c:'🇩🇰', k:'denmark flag nation country europe nordic cross red white'}, {c:'🇩🇯', k:'djibouti flag nation country africa light blue green white red star'}, {c:'🇩🇲', k:'dominica flag nation country caribbean island green bird cross star'}, 
                {c:'🇩🇴', k:'dominican republic flag nation country caribbean island cross blue red white shield'}, {c:'🇪🇨', k:'ecuador flag nation country south america yellow blue red shield eagle'}, {c:'🇪🇬', k:'egypt flag nation country africa arab red white black eagle'}, {c:'🇸🇻', k:'el salvador flag nation country central america blue white shield'}, 
                {c:'🇬🇶', k:'equatorial guinea flag nation country africa green white red blue triangle tree'}, {c:'🇪🇷', k:'eritrea flag nation country africa green red blue triangle branch'}, {c:'🇪🇪', k:'estonia flag nation country europe baltic blue black white'}, {c:'🇪🇹', k:'ethiopia flag nation country africa green yellow red star pentagram'}, 
                {c:'🇪🇺', k:'european union flag europe stars circle blue eu symbol union'}, {c:'🇫🇰', k:'falkland islands flag territory ocean uk shield blue sheep'}, {c:'🇫🇴', k:'faroe islands flag territory nordic cross white blue red denmark'}, {c:'🇫🇯', k:'fiji flag nation country oceania island blue uk shield pigeon'}, 
                {c:'🇫🇮', k:'finland flag nation country europe nordic cross white blue'}, {c:'🇫🇷', k:'france flag nation country europe blue white red french paris'}, {c:'🇬🇫', k:'french guiana flag territory south america star yellow green red'}, {c:'🇵🇫', k:'french polynesia flag territory oceania red white boat sun french'}, 
                {c:'🇹🇫', k:'french southern territories flag territory oceania french letters stars shield'}, {c:'🇬🇦', k:'gabon flag nation country africa green yellow blue'}, {c:'🇬🇲', k:'gambia flag nation country africa red blue green white line'}, {c:'🇬🇪', k:'georgia flag nation country caucasus europe asia white red cross'}, 
                {c:'🇩🇪', k:'germany flag nation country europe black red yellow deutschland'}, {c:'🇬🇭', k:'ghana flag nation country africa red yellow green star black'}, {c:'🇬🇮', k:'gibraltar flag territory europe spain uk castle key red white'}, {c:'🇬🇷', k:'greece flag nation country europe mediterranean cross blue white'}, 
                {c:'🇬🇱', k:'greenland flag territory north america denmark white red circle half'}, {c:'🇬🇩', k:'grenada flag nation country caribbean island red yellow green star flame'}, {c:'🇬🇵', k:'guadeloupe flag territory caribbean french black green yellow sun plant'}, {c:'🇬🇺', k:'guam flag territory oceania us shield blue red border palm beach'}, 
                {c:'🇬🇹', k:'guatemala flag nation country central america light blue white shield bird'}, {c:'🇬🇬', k:'guernsey flag territory europe uk cross red yellow white island'}, {c:'🇬🇳', k:'guinea flag nation country africa red yellow green pan'}, {c:'🇬🇼', k:'guinea bissau flag nation country africa red yellow green star black'}, 
                {c:'🇬🇾', k:'guyana flag nation country south america green yellow red triangle black white arrow'}, {c:'🇭🇹', k:'haiti flag nation country caribbean island blue red shield'}, {c:'🇭🇳', k:'honduras flag nation country central america blue white star five'}, {c:'🇭🇰', k:'hong kong flag territory asia china red flower white petal'}, 
                {c:'🇭🇺', k:'hungary flag nation country europe red white green'}, {c:'🇮🇸', k:'iceland flag nation country europe nordic cross blue white red'}, {c:'🇮🇳', k:'india flag nation country asia orange white green wheel ashoka chakra'}, {c:'🇮🇩', k:'indonesia flag nation country asia red white'}, 
                {c:'🇮🇷', k:'iran flag nation country middle east asia green white red symbol'}, {c:'🇮🇶', k:'iraq flag nation country middle east arab red white black green text'}, {c:'🇮🇪', k:'ireland flag nation country europe green white orange'}, {c:'🇮🇲', k:'isle of man flag territory europe uk red legs triskelion'}, 
                {c:'🇮🇱', k:'israel flag nation country middle east jewish star david blue white'}, {c:'🇮🇹', k:'italy flag nation country europe green white red pizza rome'}, {c:'🇯🇲', k:'jamaica flag nation country caribbean island green yellow black cross'}, {c:'🇯🇵', k:'japan flag nation country asia red circle sun white tokyo'}, 
                {c:'🇯🇪', k:'jersey flag territory europe uk white red cross shield lions'}, {c:'🇯🇴', k:'jordan flag nation country middle east arab black white green red star'}, {c:'🇰🇿', k:'kazakhstan flag nation country asia light blue sun eagle pattern'}, {c:'🇰🇪', k:'kenya flag nation country africa black red green white shield spear'}, 
                {c:'🇰🇮', k:'kiribati flag nation country oceania island red wave bird sun'}, {c:'🇽🇰', k:'kosovo flag nation country europe balkan blue yellow map star six'}, {c:'🇰🇼', k:'kuwait flag nation country middle east arab green white red black'}, {c:'🇰🇬', k:'kyrgyzstan flag nation country asia red sun lines pattern'}, 
                {c:'🇱🇦', k:'laos flag nation country asia red blue white circle moon'}, {c:'🇱🇻', k:'latvia flag nation country europe baltic red white maroon line'}, {c:'🇱🇧', k:'lebanon flag nation country middle east arab red white tree cedar'}, {c:'🇱🇸', k:'lesotho flag nation country africa blue white green hat black basotho'}, 
                {c:'🇱🇷', k:'liberia flag nation country africa star stripes red white blue like us'}, {c:'🇱🇾', k:'libya flag nation country africa arab red black green star crescent'}, {c:'🇱🇮', k:'liechtenstein flag nation country europe blue red crown gold'}, {c:'🇱🇹', k:'lithuania flag nation country europe baltic yellow green red'}, 
                {c:'🇱🇺', k:'luxembourg flag nation country europe red white light blue'}, {c:'🇲🇴', k:'macao flag territory asia china green flower lotus water star'}, {c:'🇲🇬', k:'madagascar flag nation country africa island white red green'}, {c:'🇲🇼', k:'malawi flag nation country africa black red green sun rising'}, 
                {c:'🇲🇾', k:'malaysia flag nation country asia stripes red white blue star crescent yellow'}, {c:'🇲🇻', k:'maldives flag nation country asia island red green white crescent'}, {c:'🇲🇱', k:'mali flag nation country africa green yellow red pan'}, {c:'🇲🇹', k:'malta flag nation country europe island white red cross george grey'}, 
                {c:'🇲🇭', k:'marshall islands flag nation country oceania blue star orange white stripe ray'}, {c:'🇲🇶', k:'martinique flag territory caribbean french island blue cross white snake'}, {c:'🇲🇷', k:'mauritania flag nation country africa green yellow star crescent red border'}, {c:'🇲🇺', k:'mauritius flag nation country africa island red blue yellow green'}, 
                {c:'🇾🇹', k:'mayotte flag territory africa island french white shield sea horse text'}, {c:'🇲🇽', k:'mexico flag nation country north america green white red eagle snake cactus'}, {c:'🇫🇲', k:'micronesia flag nation country oceania island light blue star white four'}, {c:'🇲🇩', k:'moldova flag nation country europe blue yellow red shield eagle ox'}, 
                {c:'🇲🇨', k:'monaco flag nation country europe red white half'}, {c:'🇲🇳', k:'mongolia flag nation country asia red blue yellow symbol soyombo fire'}, {c:'🇲🇪', k:'montenegro flag nation country europe balkan red gold eagle double crown'}, {c:'🇲🇸', k:'montserrat flag territory caribbean uk blue shield cross lady'}, 
                {c:'🇲🇦', k:'morocco flag nation country africa arab red star green pentagram'}, {c:'🇲🇿', k:'mozambique flag nation country africa green black yellow red star book gun ak47 hoe'}, {c:'🇲🇲', k:'myanmar flag nation country asia burma yellow green red star white'}, {c:'🇳🇦', k:'namibia flag nation country africa blue red green white sun yellow'}, 
                {c:'🇳🇷', k:'nauru flag nation country oceania island blue yellow line star white'}, {c:'🇳🇵', k:'nepal flag nation country asia himalaya red blue triangle shape sun moon'}, {c:'🇳🇱', k:'netherlands flag nation country europe red white blue holland'}, {c:'🇳🇨', k:'new caledonia flag territory oceania french blue red green yellow circle emblem'}, 
                {c:'🇳🇿', k:'new zealand flag nation country oceania down under uk blue star red kiwi'}, {c:'🇳🇮', k:'nicaragua flag nation country central america light blue white shield triangle volcano'}, {c:'🇳🇪', k:'niger flag nation country africa orange white green circle sun'}, {c:'🇳🇬', k:'nigeria flag nation country africa green white green stripe'}, 
                {c:'🇳🇺', k:'niue flag territory oceania yellow uk star circle'}, {c:'🇳🇫', k:'norfolk island flag territory oceania australia green white pine tree'}, {c:'🇰🇵', k:'north korea flag nation country asia red blue white star circle dprk'}, {c:'🇲🇰', k:'north macedonia flag nation country europe balkan red yellow sun ray'}, 
                {c:'🇲🇵', k:'northern mariana islands flag territory oceania us blue star latte stone wreath flower'}, {c:'🇳🇴', k:'norway flag nation country europe nordic cross red white blue'}, {c:'🇴🇲', k:'oman flag nation country middle east arab white red green sword dagger khanjar'}, {c:'🇵🇰', k:'pakistan flag nation country asia green white star crescent'}, 
                {c:'🇵🇼', k:'palau flag nation country oceania island light blue yellow circle moon'}, {c:'🇵🇸', k:'palestinian territories flag nation middle east arab black white green red triangle palestine free'}, {c:'🇵🇦', k:'panama flag nation country central america red blue white star square'}, {c:'🇵🇬', k:'papua new guinea flag nation country oceania red black star yellow bird paradise'}, 
                {c:'🇵🇾', k:'paraguay flag nation country south america red white blue shield star seal'}, {c:'🇵🇪', k:'peru flag nation country south america red white red stripe shield animal'}, {c:'🇵🇭', k:'philippines flag nation country asia blue red white triangle sun star'}, {c:'🇵🇳', k:'pitcairn islands flag territory oceania uk blue shield anchor bible plant'}, 
                {c:'🇵🇱', k:'poland flag nation country europe white red stripe'}, {c:'🇵🇹', k:'portugal flag nation country europe green red shield sphere yellow castle shield'}, {c:'🇵🇷', k:'puerto rico flag territory caribbean island red white blue triangle star'}, {c:'🇶🇦', k:'qatar flag nation country middle east arab maroon white zigzag edge tooth'}, 
                {c:'🇷🇪', k:'reunion flag territory africa island french flag volcano yellow red blue'}, {c:'🇷🇴', k:'romania flag nation country europe blue yellow red stripe chad'}, {c:'🇷🇺', k:'russia flag nation country europe asia white blue red stripe moscow'}, {c:'🇷🇼', k:'rwanda flag nation country africa light blue yellow green sun ray'}, 
                {c:'🇼🇸', k:'samoa flag nation country oceania island red blue star cross south'}, {c:'🇸🇲', k:'san marino flag nation country europe white light blue shield crown mountain tree'}, {c:'🇸🇹', k:'sao tome flag nation country africa island green yellow red triangle black star'}, {c:'🇸🇦', k:'saudi arabia flag nation country middle east arab green white text sword islam'}, 
                {c:'🇸🇳', k:'senegal flag nation country africa green yellow red star pan stripe'}, {c:'🇷🇸', k:'serbia flag nation country europe balkan red blue white shield eagle double crown'}, {c:'🇸🇨', k:'seychelles flag nation country africa island blue yellow red white green ray angle'}, {c:'🇸🇱', k:'sierra leone flag nation country africa green white light blue stripe'}, 
                {c:'🇸🇬', k:'singapore flag nation country asia red white moon crescent star five'}, {c:'🇸🇽', k:'sint maarten flag territory caribbean island dutch red blue white triangle shield sun courthouse'}, {c:'🇸🇰', k:'slovakia flag nation country europe white blue red shield cross double mountain'}, {c:'🇸🇮', k:'slovenia flag nation country europe white blue red shield mountain star wave'}, 
                {c:'🇸🇧', k:'solomon islands flag nation country oceania blue green yellow line diagonal white star'}, {c:'🇸🇴', k:'somalia flag nation country africa light blue white star five point center'}, {c:'🇿🇦', k:'south africa flag nation country africa green yellow black white red blue y shape mandela'}, {c:'🇬🇸', k:'south georgia flag territory oceania island uk blue shield lion penguin seal animal star'}, 
                {c:'🇰🇷', k:'south korea flag nation country asia white circle red blue trigram black seoul'}, {c:'🇸🇸', k:'south sudan flag nation country africa black red green white triangle blue star yellow'}, {c:'🇪🇸', k:'spain flag nation country europe red yellow red stripe shield crown pillar eagle'}, {c:'🇱🇰', k:'sri lanka flag nation country asia island yellow lion sword maroon green orange square'}, 
                {c:'🇧🇱', k:'st barthelemy flag territory caribbean french island white shield blue cross pelican tree crown text'}, {c:'🇸🇭', k:'st helena flag territory africa island uk blue shield bird coast ship flag cross shield'}, {c:'🇰🇳', k:'st kitts flag nation country caribbean island green red black line diagonal yellow star white'}, {c:'🇱🇨', k:'st lucia flag nation country caribbean island light blue triangle yellow black white shape peak'}, 
                {c:'🇲🇫', k:'st martin flag territory caribbean french island blue white red stripe'}, {c:'🇵🇲', k:'st pierre flag territory north america french blue ship yellow wave white square detail cross'}, {c:'🇻🇨', k:'st vincent flag nation country caribbean island blue yellow green v shape diamond diamond'}, {c:'🇸🇩', k:'sudan flag nation country africa arab red white black green triangle'}, 
                {c:'🇸🇷', k:'suriname flag nation country south america green white red stripe yellow star five point'}, {c:'🇸🇯', k:'svalbard flag territory europe island norway red white blue cross nordic shape cold snow'}, {c:'🇸🇪', k:'sweden flag nation country europe blue yellow cross nordic ikea'}, {c:'🇨🇭', k:'switzerland flag nation country europe red square white cross plus alps'}, 
                {c:'🇸🇾', k:'syria flag nation country middle east arab red white black green star two point'}, {c:'🇹🇼', k:'taiwan flag nation country asia red blue white square sun ray shape republic china'}, {c:'🇹🇯', k:'tajikistan flag nation country asia red white green crown star gold seven arc line point'}, {c:'🇹🇿', k:'tanzania flag nation country africa green blue black yellow line diagonal stripe shape angle split'}, 
                {c:'🇹🇭', k:'thailand flag nation country asia red white blue stripe horizontal thick line bangkok'}, {c:'🇹🇱', k:'timor leste flag nation country asia oceania island red yellow black triangle white star shape point'}, {c:'🇹🇬', k:'togo flag nation country africa green yellow horizontal stripe red square white star line point pan'}, {c:'🇹🇰', k:'tokelau flag territory oceania island blue sail boat yellow star cross shape cross wind water sea'}, 
                {c:'🇹🇴', k:'tonga flag nation country oceania island red white square red cross shape box island'}, {c:'🇹🇹', k:'trinidad flag nation country caribbean island red black diagonal white line stripe cross shape square point'}, {c:'🇹🇳', k:'tunisia flag nation country africa arab red white circle moon star crescent line shape round'}, {c:'🇹🇷', k:'turkey flag nation country europe asia middle east red white moon star crescent shape point arab balkan'}, 
                {c:'🇹🇲', k:'turkmenistan flag nation country asia green vertical maroon carpet pattern moon star crescent white shape stripe pattern rug point'}, {c:'🇹🇨', k:'turks caicos flag territory caribbean uk blue shield shell lobster cactus shape water ocean plant seal animal sea shield line'}, {c:'🇹🇻', k:'tuvalu flag nation country oceania island uk light blue yellow star nine pattern map star group point line'}, {c:'🇺🇬', k:'uganda flag nation country africa black yellow red stripe horizontal bird crane circle white shape line circle pan round'}, 
                {c:'🇺🇦', k:'ukraine flag nation country europe blue yellow horizontal stripe line kiev color free'}, {c:'🇦🇪', k:'united arab emirates flag nation country middle east arab green white black red stripe vertical horizontal pan uae dubai'}, {c:'🇬🇧', k:'united kingdom flag nation country europe uk cross red white blue jack union english british london'}, {c:'🇺🇸', k:'united states flag nation country north america us usa america red white blue stripe star fifty shape line point square star stripe'}, 
                {c:'🇺🇾', k:'uruguay flag nation country south america blue white horizontal stripe line sun face yellow shape ray box square ray'}, {c:'🇻🇮', k:'us virgin islands flag territory caribbean island white blue yellow eagle shield arrow branch star us text shape bird shape animal leaf symbol plant'}, {c:'🇺🇿', k:'uzbekistan flag nation country asia blue white green stripe red line horizontal moon star twelve white pattern crescent dot shape'}, {c:'🇻🇺', k:'vanuatu flag nation country oceania island red green black y shape yellow line pig tusk plant branch shape leaf green point line cross split yellow'}, 
                {c:'🇻🇦', k:'vatican city flag nation country europe yellow white square cross key red cord crown catholic pope holy religion star shield crown line stripe cross point'}, {c:'🇻🇪', k:'venezuela flag nation country south america yellow blue red horizontal stripe star eight white arc pattern shape point line point arc star shape'}, {c:'🇻🇳', k:'vietnam flag nation country asia red yellow star five point shape point center color yellow shape red box flag color star line'}, {c:'🇼🇫', k:'wallis futuna flag territory oceania island french red white cross square shield red point cross square cross line white point cross french red color line flag pattern flag'}, 
                {c:'🇪🇭', k:'western sahara flag nation country africa arab black white green horizontal stripe red triangle star crescent point pan star green point triangle red red stripe green line horizontal color red'}, {c:'🇾🇪', k:'yemen flag nation country middle east arab red white black horizontal stripe pan color box color point flag flag horizontal red black white pattern'}, {c:'🇿🇲', k:'zambia flag nation country africa green vertical stripe red black orange shape bird eagle fly color red black color green orange line shape animal'}, {c:'🇿🇼', k:'zimbabwe flag nation country africa green yellow red black horizontal stripe white triangle star red bird animal shape stone shape line point star red yellow pan green color flag pan triangle point'}
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
                    flex-shrink: 0; 
                }
                .ep-search-container {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .ep-search {
                    width: 100%;
                    background: #262626;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 30px 8px 12px;
                    color: #fff;
                    font-size: 14px;
                    outline: none;
                }
                .ep-clear-search {
                    position: absolute;
                    right: 10px;
                    background: none;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    display: none;
                    font-size: 16px;
                    padding: 0;
                    outline: none;
                }
                .ep-clear-search:hover { color: #fff; }
                .ep-nav {
                    display: flex;
                    overflow-x: auto;
                    padding: 6px 4px;
                    border-bottom: 1px solid #262626;
                    gap: 4px;
                    scrollbar-width: none;
                    flex-shrink: 0;
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
                    min-height: 0; /* Critical for flex scrolling */
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
                    position: relative;
                }
                .ep-emoji:active { transform: scale(1.2); background: #333; }
                
                /* Tooltip styling */
                .ep-emoji[title]:hover::after {
                    content: attr(title);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #333;
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    white-space: nowrap;
                    z-index: 10;
                    pointer-events: none;
                    opacity: 0.9;
                    font-family: sans-serif;
                }
                
                #recents-context {
                    position: absolute; display: none;
                    background: #333; color: white;
                    padding: 8px 12px; border-radius: 8px;
                    font-size: 0.8rem; z-index: 100;
                    cursor: pointer;
                }
                #recents-context:hover { background: #444; }
            </style>
            <div class="ep-header">
                <div class="ep-search-container">
                    <input type="text" class="ep-search" placeholder="Search emoji...">
                    <button class="ep-clear-search">&times;</button>
                </div>
            </div>
            <div class="ep-nav" id="nav-bar"></div>
            <div class="ep-body" id="emoji-body"></div>
            <div id="recents-context">Clear Recents</div>
        `;
    }

    setupEvents() {
        const searchInput = this.shadowRoot.querySelector('.ep-search');
        const clearBtn = this.shadowRoot.querySelector('.ep-clear-search');
        
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            clearBtn.style.display = val ? 'block' : 'none';
            this.filterEmojis(val);
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            this.filterEmojis('');
        });

        const recentsBtn = this.shadowRoot.getElementById('recents-context');
        recentsBtn.addEventListener('click', () => {
            this.recentEmojis = [];
            localStorage.setItem('goorac_recents', JSON.stringify([]));
            this.loadEmojis('all');
            recentsBtn.style.display = 'none';
        });
        
        // Hide context menu if clicking anywhere else
        this.shadowRoot.addEventListener('click', (e) => {
            if (e.target.id !== 'recents-context') {
                recentsBtn.style.display = 'none';
            }
        });

        // Setup scroll spy for nav bar highlights
        const body = this.shadowRoot.getElementById('emoji-body');
        body.addEventListener('scroll', () => {
            if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.updateActiveNavOnScroll();
            }, 50);
        });
    }

    // AI suggestion engine - sort by frequency of usage
    getSuggestedEmojis() {
        const sorted = Object.entries(this.emojiFrequency).sort((a, b) => b[1] - a[1]);
        // Filter out emojis that are currently in the 16 recent slots so they don't duplicate
        const filtered = sorted.filter(item => !this.recentEmojis.includes(item[0]));
        // Take top 16 suggestions
        return filtered.slice(0, 16).map(item => ({ c: item[0], k: 'suggested ai smart frequent' }));
    }

    updateActiveNavOnScroll() {
        const body = this.shadowRoot.getElementById('emoji-body');
        const categories = this.shadowRoot.querySelectorAll('.ep-body > div[id^="cat-"]');
        let currentActive = null;

        for (const cat of categories) {
            // If the category top is within the upper half of the view container
            if (cat.offsetTop - body.scrollTop <= body.clientHeight / 2) {
                currentActive = cat.id.replace('cat-', '');
            } else {
                break;
            }
        }

        if (currentActive) {
            this.shadowRoot.querySelectorAll('.ep-nav-item').forEach(i => i.classList.remove('active'));
            const activeNav = this.shadowRoot.querySelector(`.ep-nav-item[data-target="${currentActive}"]`);
            if (activeNav) activeNav.classList.add('active');
        }
    }

    loadEmojis(filter) {
        const navBar = this.shadowRoot.getElementById('nav-bar');
        const body = this.shadowRoot.getElementById('emoji-body');
        
        navBar.innerHTML = '';
        body.innerHTML = '';

        let displayData = [...this.emojiData];
        
        // Insert Suggestions AI if we have data
        const suggestedList = this.getSuggestedEmojis();
        if (suggestedList.length > 0) {
            displayData.unshift({
                id: 'suggested', name: 'Suggested', icon: '✨', 
                emojis: suggestedList 
            });
        }

        // Insert Recents (limit to 16 handled in addToRecents/constructor)
        if (this.recentEmojis.length > 0) {
            displayData.unshift({
                id: 'recents', name: 'Recent', icon: '🕒', 
                emojis: this.recentEmojis.map(e => ({c: e, k: 'recent'})) 
            });
        }

        displayData.forEach(cat => {
            if(cat.id === 'recents' && this.recentEmojis.length === 0) return;
            const span = document.createElement('span');
            span.className = 'ep-nav-item';
            span.dataset.target = cat.id; // added for scroll spy
            span.innerText = cat.icon;
            span.title = cat.name;
            span.onclick = () => {
                const el = this.shadowRoot.getElementById(`cat-${cat.id}`);
                if(el) el.scrollIntoView({block: 'start'});
                this.shadowRoot.querySelectorAll('.ep-nav-item').forEach(i => i.classList.remove('active'));
                span.classList.add('active');
            };
            navBar.appendChild(span);
        });

        // Set initial active nav
        if (navBar.firstChild) navBar.firstChild.classList.add('active');

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
                el.title = eObj.k.split(' ')[0] || cat.name; // Simple hover title logic
                el.innerText = eObj.c; // Removed skin tone application
                el.onclick = () => {
                    this.addToRecents(eObj.c); 
                    this.dispatchEvent(new CustomEvent('emoji-click', { 
                        detail: { emoji: eObj.c, unicode: eObj.c },
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
        const navBar = this.shadowRoot.getElementById('nav-bar');
        
        if(!query) {
            navBar.style.display = 'flex';
            this.loadEmojis('all');
            return;
        }
        
        body.innerHTML = '';
        navBar.style.display = 'none'; // Hide nav while searching
        
        const grid = document.createElement('div');
        grid.className = 'ep-grid';
        grid.style.marginTop = '10px';

        let count = 0;
        this.emojiData.forEach(cat => {
            cat.emojis.forEach(e => {
                if(count > 100) return; 
                if(e.k.includes(query.toLowerCase()) || e.c === query) {
                    const el = document.createElement('div');
                    el.className = 'ep-emoji';
                    el.title = e.k.split(' ')[0] || "emoji";
                    el.innerText = e.c; // Removed skin tone application
                    el.onclick = () => {
                        this.addToRecents(e.c);
                        this.dispatchEvent(new CustomEvent('emoji-click', { detail: { emoji: e.c } }));
                    };
                    grid.appendChild(el);
                    count++;
                }
            });
        });
        
        if (count === 0) {
            const noResults = document.createElement('div');
            noResults.style.color = '#888';
            noResults.style.textAlign = 'center';
            noResults.style.marginTop = '20px';
            noResults.innerText = 'No emojis found.';
            body.appendChild(noResults);
        } else {
            body.appendChild(grid);
        }
    }

    addToRecents(char) {
        // AI Tracking logic
        this.emojiFrequency[char] = (this.emojiFrequency[char] || 0) + 1;
        localStorage.setItem('goorac_emoji_freq', JSON.stringify(this.emojiFrequency));

        // Recents array manipulation - limited to 16
        this.recentEmojis = this.recentEmojis.filter(e => e !== char);
        this.recentEmojis.unshift(char);
        if(this.recentEmojis.length > 16) this.recentEmojis.pop(); // Max 2 lines (8 columns x 2)
        localStorage.setItem('goorac_recents', JSON.stringify(this.recentEmojis));
        
        this.updateRecentsDOM();
    }

    updateRecentsDOM() {
        let recentsContainer = this.shadowRoot.getElementById('cat-recents');
        
        // If we just started having recents or the suggested list layout needs to recalculate, trigger full reload
        if(!recentsContainer || this.recentEmojis.length === 1 || this.recentEmojis.length % 8 === 1) {
             this.loadEmojis('all');
             return;
        }

        const grid = recentsContainer.querySelector('.ep-grid');
        if(grid) {
            grid.innerHTML = '';
            this.recentEmojis.forEach(char => {
                 const el = document.createElement('div');
                 el.className = 'ep-emoji';
                 el.innerText = char; 
                 el.title = 'recent';
                 el.onclick = () => {
                    this.addToRecents(char);
                    this.dispatchEvent(new CustomEvent('emoji-click', { detail: { emoji: char, unicode: char }, bubbles: true, composed: true }));
                 };
                 grid.appendChild(el);
            });
        }
    }
}

customElements.define('emoji-picker', EmojiPicker);
