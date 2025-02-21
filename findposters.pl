
while (<>) {
    if (/poster='([^']+-poster\.jpg)'/) {
        print $1."\n";
    }
}
