
while (<>) {
    if (/src='([^']+\.gif)'/) {
        print $1."\n";
    }
}
