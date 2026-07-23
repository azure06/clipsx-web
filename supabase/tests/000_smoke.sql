begin;

select plan(1);

select ok(true, 'the local pgTAP harness is available');

select * from finish();

rollback;
