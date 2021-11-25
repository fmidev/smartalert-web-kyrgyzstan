<?php

// $SUBDIRS = [""]; # if no subdirectories are needed
$SUBDIRS = ["meteorology", "hydrology"];

foreach($SUBDIRS as $dir) {
  $DIR=trim(`find data/$dir/publishedCap -type d|sort -n|tail -1`);
  $FILES = scandir($DIR);
  
  $capfiles;
  
  foreach ($FILES as $file)
    {
      if (preg_match("/_ALERT_/",$file) || preg_match("/_UPDATE_/",$file))
        {
          $capfiles[]=$DIR."/".$file;
        }
    }
}


header("Content-type: application/json");
header("Pragma: no-cache");
header("Cache-control: no-cache, must-revalidate");
header("Expires: Fri, 01 Jan 1990 00:00:00 GMT");
print json_encode($capfiles);

