#!/usr/bin/env perl
# Mechanical CRA → Next.js page port. See port-pages.js for the full
# rationale; this is the same logic in Perl so it runs without node.
use strict;
use warnings;
use File::Path qw(make_path);
use File::Basename qw(dirname basename);

my $SRC = '../src/pages';
my $APP = 'app';

my %MAP = (
    'CreateProfile.tsx'        => 'profile/create/page.tsx',
    'Workers.tsx'              => 'workers/page.tsx',
    'WorkerProfile.tsx'        => 'workers/[id]/page.tsx',
    'Jobs.tsx'                 => 'jobs/page.tsx',
    'JobDetail.tsx'            => 'jobs/[id]/page.tsx',
    'PostJob.tsx'              => 'post/page.tsx',
    'WasteBuyers.tsx'          => 'atxod/page.tsx',
    'WasteBuyerProfile.tsx'    => 'atxod/[id]/page.tsx',
    'CreateWasteBuyer.tsx'     => 'atxod/create/page.tsx',
    'UslugaProviders.tsx'      => 'usluga/page.tsx',
    'UslugaProfile.tsx'        => 'usluga/[id]/page.tsx',
    'CreateUsluga.tsx'         => 'usluga/create/page.tsx',
    'StanokMasters.tsx'        => 'stanok/page.tsx',
    'StanokProfile.tsx'        => 'stanok/[id]/page.tsx',
    'CreateStanok.tsx'         => 'stanok/create/page.tsx',
    'Delivery.tsx'             => 'delivery/page.tsx',
    'DeliveryProfile.tsx'      => 'delivery/[id]/page.tsx',
    'CreateDelivery.tsx'       => 'delivery/create/page.tsx',
    'StanokAds.tsx'            => 'stanok-ads/page.tsx',
    'StanokAdDetail.tsx'       => 'stanok-ads/[id]/page.tsx',
    'CreateStanokAd.tsx'       => 'stanok-ads/create/page.tsx',
    'CreateStanokAd.edit.tsx'  => 'stanok-ads/[id]/edit/page.tsx',
    'InstallBrigades.tsx'      => 'ustanofka/page.tsx',
    'InstallBrigadeProfile.tsx'=> 'ustanofka/[id]/page.tsx',
    'CreateInstallBrigade.tsx' => 'ustanofka/create/page.tsx',
    'Arkachilar.tsx'           => 'arkachilar/page.tsx',
    'ArkachiProfile.tsx'       => 'arkachilar/[id]/page.tsx',
    'CreateArkachi.tsx'        => 'arkachilar/create/page.tsx',
    'Admin.tsx'                => 'admin/page.tsx',
);

# Replaces the react-router-dom import with the appropriate next/* imports.
sub rewrite_router_imports {
    my $s = shift;
    while ($s =~ /import\s*\{([^}]+)\}\s*from\s*['"]react-router-dom['"]\s*;?/) {
        my $names = $1;
        my $whole = $&;
        my @list = grep { length } map { my $n = $_; $n =~ s/^\s+//; $n =~ s/\s+$//; $n } split /,/, $names;
        my @nav = grep { $_ eq 'useNavigate' || $_ eq 'useParams' || $_ eq 'useLocation' || $_ eq 'useSearchParams' } @list;
        my @lnk = grep { $_ eq 'Link' || $_ eq 'NavLink' } @list;
        my @out;
        if (@nav) {
            my %seen;
            my @mapped;
            for my $n (@nav) {
                my $m = $n eq 'useNavigate' ? 'useRouter' : ($n eq 'useLocation' ? 'usePathname' : $n);
                next if $seen{$m}++;
                push @mapped, $m;
            }
            push @out, "import { " . join(', ', @mapped) . " } from 'next/navigation';";
        }
        if (@lnk) {
            push @out, "import Link from 'next/link';";
        }
        my $repl = join("\n", @out);
        my $idx = index($s, $whole);
        substr($s, $idx, length($whole)) = $repl;
    }
    return $s;
}

sub transform {
    my ($s, $src_name) = @_;

    $s =~ s{from\s+['"]\.\./ui['"]}{from '\@/components/ui'}g;
    $s =~ s{from\s+['"]\.\./api['"]}{from '\@/lib/api'}g;
    $s =~ s{from\s+['"]\.\./persist['"]}{from '\@/lib/persist'}g;
    $s =~ s{from\s+['"]\.\./userLocation['"]}{from '\@/lib/userLocation'}g;
    $s =~ s{from\s+['"]\.\./data['"]}{from '\@/lib/data'}g;
    $s =~ s{from\s+['"]\.\./constants['"]}{from '\@/lib/constants'}g;
    $s =~ s{from\s+['"]\.\./SpecIcon['"]}{from '\@/components/SpecIcon'}g;
    $s =~ s{from\s+['"]\.\./StanokSpecIcon['"]}{from '\@/components/StanokSpecIcon'}g;
    $s =~ s{from\s+['"]\.\./Layout['"]}{from '\@/components/Layout'}g;
    $s =~ s{from\s+['"]\.\./components/([A-Za-z0-9_]+)['"]}{from '\@/components/$1'}g;

    $s = rewrite_router_imports($s);

    $s =~ s{const\s+nav\s*=\s*useNavigate\(\)\s*;}{const router = useRouter();}g;
    $s =~ s{useNavigate\(\)}{useRouter()}g;

    $s =~ s{const\s+(\w+)\s*=\s*useLocation\(\)\s*;}{const ${1}Pathname = usePathname() || '/';}g;
    $s =~ s{(\w+)\.pathname}{ $1 eq 'window' ? "window.pathname" : $1 . "Pathname" }ge;

    $s =~ s{\bnav\(([^,)]+),\s*\{\s*replace:\s*true\s*\}\s*\)}{router.replace($1)}g;
    $s =~ s{\bnav\(}{router.push(}g;

    $s =~ s{(<Link\s+[^>]*?)\bto=}{$1href=}g;
    $s =~ s{<NavLink}{<Link}g;
    $s =~ s{</NavLink>}{</Link>}g;

    $s =~ s{process\.env\.PUBLIC_URL\s*\+\s*}{}g;

    my $base = $src_name; $base =~ s/\.edit\.tsx$//; $base =~ s/\.tsx$//;
    my $comp = $base; $comp =~ s/[^A-Za-z0-9_]/_/g;

    if ($s =~ /export\s+const\s+\Q$comp\E\s*:\s*React\.FC[^=]*=\s*\(\)\s*=>\s*\{/) {
        $s =~ s|export\s+const\s+\Q$comp\E\s*:\s*React\.FC[^=]*=\s*\(\)\s*=>\s*\{|export default function $comp() \{|;
    } elsif ($s =~ /export\s+const\s+\Q$comp\E\s*:\s*React\.FC[^=]*=\s*\(\)\s*=>\s*\(/) {
        $s =~ s|export\s+const\s+\Q$comp\E\s*:\s*React\.FC[^=]*=\s*\(\)\s*=>\s*\(|export default function $comp() \{ return (|;
        $s =~ s|\)\s*;\s*\z|); }|;
    }

    if ($s !~ /^['"]use client['"]/) {
        $s = "'use client';\n" . $s;
    }
    return $s;
}

my $written = 0;
for my $src_name (sort keys %MAP) {
    my $real_src = $src_name; $real_src =~ s/\.edit\.tsx$/.tsx/;
    my $src_path = "$SRC/$real_src";
    unless (-f $src_path) {
        warn "[skip] missing $src_path\n";
        next;
    }
    my $dest = "$APP/" . $MAP{$src_name};
    make_path(dirname($dest));
    open my $in, '<:utf8', $src_path or die "open $src_path: $!";
    local $/; my $content = <$in>;
    close $in;
    my $out = transform($content, $src_name);
    open my $fh, '>:utf8', $dest or die "open $dest: $!";
    print $fh $out;
    close $fh;
    $written++;
    print "[ok] $src_name -> $dest\n";
}
print "\nDone: $written files written.\n";
