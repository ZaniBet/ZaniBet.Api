// Fisher-Yates algorithme
// Mélanger un tableau de n élement
// https://fr.wikipedia.org/wiki/M%C3%A9lange_de_Fisher-Yates

var tab = ["one", "two", "three", "four", "five"];

for (var i = tab.length-1; i >= 1; i--){
  //console.log(i);
  var random = Math.floor(Math.random() * Math.floor(i));
  console.log(random);
  var f = tab[random];
  var s = tab[i];

  tab[random] = s;
  tab[i] = f;
}

console.log(tab);
