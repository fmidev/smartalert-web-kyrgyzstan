<?php
#
# 2015 Mikko Rauhala <mikko@rauhala.net>
#

$height = $_REQUEST["height"];

if (strlen($height) == 1)
  $x = 33;
else
  $x = 26;

header("Content-type: image/svg+xml");
print <<<EOT
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><circle fill="#ffffff" stroke="#0000ff" stroke-width="4" stroke-linejoin="round" stroke-miterlimit="10" cx="40" cy="40" r="19.32"/><text x="$x" y="47" fill="black" font-family="Verdana" 
        font-size="20" font-weight="bold">$height</text></svg>
EOT;
