type FoodEmojiRule = {
  emoji: string;
  keywords: string[];
};

const FOOD_EMOJI_RULES: FoodEmojiRule[] = [
  // Bowls / salads / soups
  { emoji: '🥣', keywords: ['rolled oats', 'oatmeal', 'porridge', 'congee', 'lugaw', 'soup'] },
  { emoji: '🥗', keywords: ['caesar salad', 'cobb salad', 'garden salad', 'salad', 'greens'] },
  { emoji: '🥣', keywords: ['acai bowl', 'smoothie bowl', 'yogurt bowl', 'grain bowl', 'bowl'] },

  // Rice / grains / noodles / pasta
  { emoji: '🍚', keywords: ['white rice', 'brown rice', 'jasmine rice', 'steamed rice', 'rice'] },
  { emoji: '🍛', keywords: ['curry rice', 'katsu curry', 'curry'] },
  { emoji: '🍙', keywords: ['onigiri', 'rice ball'] },
  { emoji: '🍘', keywords: ['rice cracker', 'senbei'] },
  { emoji: '🍜', keywords: ['ramen', 'udon', 'soba', 'pancit', 'noodles', 'noodle'] },
  { emoji: '🍝', keywords: ['spaghetti', 'carbonara', 'alfredo', 'lasagna', 'pasta'] },
  { emoji: '🥡', keywords: ['takeout noodles', 'chow mein', 'lo mein', 'takeout'] },
  { emoji: '🥟', keywords: ['dumpling', 'gyoza', 'siomai', 'wonton', 'siopao filling dumpling'] },
  { emoji: '🥮', keywords: ['mooncake'] },
  { emoji: '🍲', keywords: ['stew', 'bulalo', 'nilaga', 'sinigang', 'tinola', 'pot roast'] },
  { emoji: '🍱', keywords: ['bento', 'bento box'] },

  // Bread / bakery / snacks
  { emoji: '🍞', keywords: ['bread loaf', 'loaf bread', 'bread'] },
  { emoji: '🥖', keywords: ['baguette'] },
  { emoji: '🥐', keywords: ['croissant'] },
  { emoji: '🥯', keywords: ['bagel'] },
  { emoji: '🥨', keywords: ['pretzel'] },
  { emoji: '🫓', keywords: ['flatbread', 'naan', 'roti', 'pita bread', 'chapati'] },
  { emoji: '🥪', keywords: ['sandwich', 'toastie', 'panini', 'sub', 'hoagie'] },
  { emoji: '🍞', keywords: ['toast'] },
  { emoji: '🧈', keywords: ['butter'] },
  { emoji: '🫙', keywords: ['jam', 'jelly', 'marmalade', 'peanut butter jar'] },

  // Breakfast
  { emoji: '🍳', keywords: ['scrambled egg', 'fried egg', 'omelette', 'omelet', 'egg'] },
  { emoji: '🥓', keywords: ['bacon'] },
  { emoji: '🥞', keywords: ['pancake', 'pancakes'] },
  { emoji: '🧇', keywords: ['waffle', 'waffles'] },
  { emoji: '🥣', keywords: ['cereal', 'granola', 'muesli'] },

  // Fast food / handheld
  { emoji: '🍔', keywords: ['burger', 'hamburger', 'cheeseburger'] },
  { emoji: '🍟', keywords: ['fries', 'french fries', 'chips'] },
  { emoji: '🍕', keywords: ['pizza', 'pepperoni slice'] },
  { emoji: '🌭', keywords: ['hotdog', 'hot dog'] },
  { emoji: '🌮', keywords: ['taco', 'tacos'] },
  { emoji: '🌯', keywords: ['burrito', 'wrap', 'shawarma wrap'] },
  { emoji: '🫔', keywords: ['tamale'] },
  { emoji: '🥙', keywords: ['gyro', 'shawarma', 'kebab wrap', 'falafel wrap', 'stuffed pita'] },
  { emoji: '🧆', keywords: ['falafel'] },
  { emoji: '🥙', keywords: ['doner', 'kebab', 'kofta'] },
  { emoji: '🍿', keywords: ['popcorn'] },

  // Meat / poultry / seafood
  { emoji: '🍗', keywords: ['grilled chicken', 'chicken breast', 'chicken thigh', 'chicken wing'] },
  { emoji: '🍖', keywords: ['ribs', 'bbq ribs', 'meat on bone'] },
  { emoji: '🥩', keywords: ['steak', 'beef', 'sirloin', 'ribeye', 'tenderloin'] },
  { emoji: '🥓', keywords: ['ham', 'pork belly'] },
  { emoji: '🍤', keywords: ['shrimp', 'prawn', 'tempura'] },
  { emoji: '🦐', keywords: ['garlic shrimp', 'butter shrimp'] },
  { emoji: '🦀', keywords: ['crab'] },
  { emoji: '🦞', keywords: ['lobster'] },
  { emoji: '🦪', keywords: ['oyster'] },
  { emoji: '🐟', keywords: ['fish fillet', 'fish', 'tilapia', 'bangus', 'milkfish'] },
  { emoji: '🍣', keywords: ['sushi', 'nigiri'] },
  { emoji: '🍤', keywords: ['ebi'] },
  { emoji: '🍥', keywords: ['fish cake', 'narutomaki'] },
  { emoji: '🐙', keywords: ['octopus', 'takoyaki octopus'] },
  { emoji: '🦑', keywords: ['squid', 'calamari'] },
  { emoji: '🐟', keywords: ['salmon', 'tuna', 'mackerel', 'sardine'] },

  // Pinoy / Asian common dishes (basic logger coverage)
  { emoji: '🍲', keywords: ['adobo', 'menudo', 'afritada', 'caldereta'] },
  { emoji: '🍗', keywords: ['inasal', 'fried chicken'] },
  { emoji: '🍜', keywords: ['batchoy', 'mami', 'lomi'] },
  { emoji: '🥟', keywords: ['siopao', 'xiaolongbao', 'bao'] },
  { emoji: '🍚', keywords: ['fried rice', 'sinangag'] },
  { emoji: '🍛', keywords: ['kare kare'] },
  { emoji: '🍢', keywords: ['fishball', 'kikiam', 'isaw', 'street bbq skewer', 'skewer'] },
  { emoji: '🍢', keywords: ['yakitori', 'satay'] },
  { emoji: '🍡', keywords: ['dango', 'mochi skewer'] },
  { emoji: '🍘', keywords: ['crackers'] },

  // Fruits
  { emoji: '🍎', keywords: ['red apple', 'apple'] },
  { emoji: '🍏', keywords: ['green apple'] },
  { emoji: '🍐', keywords: ['pear'] },
  { emoji: '🍊', keywords: ['orange', 'mandarin', 'tangerine'] },
  { emoji: '🍋', keywords: ['lemon'] },
  { emoji: '🍋', keywords: ['calamansi', 'lime'] },
  { emoji: '🍌', keywords: ['banana', 'saba'] },
  { emoji: '🍉', keywords: ['watermelon'] },
  { emoji: '🍇', keywords: ['grapes', 'grape'] },
  { emoji: '🍓', keywords: ['strawberry'] },
  { emoji: '🫐', keywords: ['blueberry', 'blueberries'] },
  { emoji: '🍈', keywords: ['melon', 'cantaloupe', 'honeydew'] },
  { emoji: '🍒', keywords: ['cherry', 'cherries'] },
  { emoji: '🍑', keywords: ['peach'] },
  { emoji: '🥭', keywords: ['mango'] },
  { emoji: '🍍', keywords: ['pineapple'] },
  { emoji: '🥥', keywords: ['coconut'] },
  { emoji: '🥝', keywords: ['kiwi'] },
  { emoji: '🍅', keywords: ['tomato', 'tomatoes'] },
  { emoji: '🫒', keywords: ['olive', 'olives'] },
  { emoji: '🥑', keywords: ['avocado', 'guacamole'] },

  // Vegetables / legumes
  { emoji: '🥦', keywords: ['broccoli'] },
  { emoji: '🥬', keywords: ['lettuce', 'kale', 'bok choy', 'cabbage', 'leafy greens'] },
  { emoji: '🥒', keywords: ['cucumber'] },
  { emoji: '🌶️', keywords: ['chili', 'chilli', 'pepper', 'jalapeno'] },
  { emoji: '🫑', keywords: ['bell pepper', 'capsicum'] },
  { emoji: '🌽', keywords: ['corn', 'sweet corn'] },
  { emoji: '🥕', keywords: ['carrot'] },
  { emoji: '🧄', keywords: ['garlic'] },
  { emoji: '🧅', keywords: ['onion'] },
  { emoji: '🥔', keywords: ['potato', 'mashed potato'] },
  { emoji: '🍠', keywords: ['sweet potato', 'kamote'] },
  { emoji: '🍆', keywords: ['eggplant', 'talong'] },
  { emoji: '🍄', keywords: ['mushroom', 'mushrooms'] },
  { emoji: '🥜', keywords: ['peanut', 'peanuts'] },
  { emoji: '🫘', keywords: ['beans', 'kidney beans', 'black beans', 'monggo', 'mung bean'] },
  { emoji: '🌰', keywords: ['chestnut'] },

  // Dairy / protein snacks
  { emoji: '🧀', keywords: ['cheese', 'cheddar', 'mozzarella', 'parmesan'] },
  { emoji: '🥛', keywords: ['milk'] },
  { emoji: '🧈', keywords: ['ghee'] },
  { emoji: '🥚', keywords: ['boiled egg', 'hard boiled', 'soft boiled'] },
  { emoji: '🍮', keywords: ['yogurt', 'curd'] },
  { emoji: '🍮', keywords: ['pudding', 'custard', 'leche flan', 'flan'] },

  // Sweets / desserts
  { emoji: '🍰', keywords: ['cake', 'birthday cake'] },
  { emoji: '🎂', keywords: ['birthday'] },
  { emoji: '🧁', keywords: ['cupcake', 'muffin'] },
  { emoji: '🥧', keywords: ['pie', 'tart'] },
  { emoji: '🍪', keywords: ['cookie', 'cookies', 'biscuit'] },
  { emoji: '🍩', keywords: ['donut', 'doughnut'] },
  { emoji: '🍫', keywords: ['chocolate', 'cocoa bar'] },
  { emoji: '🍬', keywords: ['candy', 'candies'] },
  { emoji: '🍭', keywords: ['lollipop'] },
  { emoji: '🍯', keywords: ['honey'] },
  { emoji: '🍨', keywords: ['ice cream', 'gelato'] },
  { emoji: '🍦', keywords: ['soft serve', 'cone'] },
  { emoji: '🍧', keywords: ['shaved ice', 'halo halo'] },
  { emoji: '🍡', keywords: ['mochi'] },

  // Drinks
  { emoji: '💧', keywords: ['water', 'mineral water'] },
  { emoji: '🧃', keywords: ['juice', 'apple juice', 'orange juice'] },
  { emoji: '🥤', keywords: ['soft drink', 'soda', 'cola', 'smoothie', 'protein shake', 'shake'] },
  { emoji: '🧋', keywords: ['milk tea', 'boba', 'bubble tea'] },
  { emoji: '☕', keywords: ['coffee', 'espresso', 'americano', 'latte', 'cappuccino'] },
  { emoji: '🍵', keywords: ['tea', 'green tea', 'matcha'] },
  { emoji: '🫖', keywords: ['teapot'] },
  { emoji: '🥛', keywords: ['soy milk', 'almond milk', 'oat milk'] },
  { emoji: '🍺', keywords: ['beer'] },
  { emoji: '🍻', keywords: ['beers'] },
  { emoji: '🍷', keywords: ['wine', 'red wine', 'white wine'] },
  { emoji: '🥂', keywords: ['champagne', 'prosecco', 'sparkling wine'] },
  { emoji: '🍸', keywords: ['martini'] },
  { emoji: '🍹', keywords: ['cocktail', 'mocktail'] },
  { emoji: '🥃', keywords: ['whiskey', 'bourbon', 'scotch'] },
  { emoji: '🍶', keywords: ['sake'] },
  { emoji: '🧉', keywords: ['mate'] },

  // Prepared meals / misc pantry
  { emoji: '🥫', keywords: ['canned', 'can soup', 'canned tuna', 'sardines in can'] },
  { emoji: '🧂', keywords: ['salt'] },
  { emoji: '🍯', keywords: ['syrup', 'maple syrup'] },
  { emoji: '🍯', keywords: ['molasses'] },

  // Generic category catch-alls (keep near end)
  { emoji: '🥗', keywords: ['vegetable'] },
  { emoji: '🍗', keywords: ['chicken'] },
  { emoji: '🥩', keywords: ['pork', 'beef meal', 'meat'] },
  { emoji: '🐟', keywords: ['seafood'] },
  { emoji: '🍎', keywords: ['fruit'] },
  { emoji: '🥣', keywords: ['oat'] },
  { emoji: '🍽️', keywords: ['meal', 'dish', 'food'] },
];

function normalizeFoodTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getFoodEmoji(title: string, fallback = '🍽️') {
  const normalized = normalizeFoodTitle(title);

  for (const rule of FOOD_EMOJI_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.emoji;
    }
  }

  return fallback;
}

export const FoodEmoji = FOOD_EMOJI_RULES;
