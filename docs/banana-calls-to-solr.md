# Inventory of calls Banana makes to Solr

Since we are considering using Banana as a starting point for the Dashboard frontend, it'll be useful to have a list of backend endpoints and example queries that Banana makes. This will be useful both for finding places in the Banana code where these calls are made as well as for deriving a specification that the [dashboard-be-api](https://github.com/co-inform/dashboard-be-api) should provide to this front-end.

It seems there are mainly 3 services called by Banana:

1. `admin/luke` to get a list of fields available (mostly useful during configuration of the dashboard)
2. `admin/core` to get a list of collections available? (again, mostly useful during configuration of the dashboard, not so much once the dashboard has been configured and the user (policymaker/journalist) is adding filters)
3. `select` this is the main search endpoint provided by Solr. Different components call this service with different parameters to fetch data relevant to that component.

## Example calls

1.  [admin/luke?numTerms=0&wt=json](http://192.168.192.163:8984/solr/70e9e133-52b5-4195-8b43-1aa737cd26de/admin/luke?numTerms=0) returns an overview of the collection: list of fields
    
        GET http://192.168.192.163:8984/solr/70e9e133-52b5-4195-8b43-1aa737cd26de/admin/luke?numTerms=0&wt=json&indent=on
    
    RESULTS:

``` json
               {
                 "responseHeader":{
                   "status":0,
                   "QTime":3},
                 "index":{
                   "numDocs":811788,
                   "maxDoc":977933,
                   "deletedDocs":166145,
                   "indexHeapUsageBytes":-1,
                   "version":336965,
                   "segmentCount":17,
                   "current":false,
                   "hasDeletions":true,
                   "directory":"org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/70e9e133-52b5-4195-8b43-1aa737cd26de_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                   "segmentsFile":"segments_ai7",
                   "segmentsFileSizeInBytes":1600,
                   "userData":{"commitTimeMSec":"1579592424892"},
                   "lastModified":"2020-01-21T07:40:24.892Z"},
                 "fields":{
                   "_version_":{
                     "type":"long",
                     "schema":"---D-------------"},
                   "airports_hl":{
                     "type":"lowercase",
                     "schema":"-TS-M------------",
                     "dynamicBase":"*_hl"},
                   "airports_os":{
                     "type":"string",
                     "schema":"---DM-----------l",
                     "dynamicBase":"*_os"},
                   "airports_ss":{
                     "type":"lowercase",
                     "schema":"ITS-M------------",
                     "dynamicBase":"*_ss",
                     "docs":3257},
                   "applied_n_rules":{
                     "type":"long",
                     "schema":"I-SD-----OF------",
                     "docs":688750},
                   "attachments":{
                     "type":"text_general",
                     "schema":"-TS-M------------"},
                   "author":{
                     "type":"text_general",
                     "schema":"ITS--------------",
                     "docs":770030},
                   "author_s":{
                     "type":"string",
                     "schema":"I-SD-----OF-----l",
                     "dynamicBase":"*_s",
                     "docs":770041},
                   "biological_agents_hl":{
                     "type":"lowercase",
                     "schema":"-TS-M------------",
                     "dynamicBase":"*_hl"},
                   "biological_agents_os":{
                     "type":"string",
                     "schema":"---DM-----------l",
                     "dynamicBase":"*_os"},
                   "biological_agents_ss":{
                     "type":"lowercase",
                     "schema":"ITS-M------------",
                     "dynamicBase":"*_ss",
                     "docs":73},
                   "boost":{
                     "type":"float",
                     "schema":"--SD-------------"},
                   "buildings_hl":{
                     "type":"lowercase",
                     "schema":"-TS-M------------",
                     "dynamicBase":"*_hl"},
                   "buildings_os":{
                     "type":"string",
                     "schema":"---DM-----------l",
                     "dynamicBase":"*_os"},
                   "buildings_ss":{
                     "type":"lowercase",
                     "schema":"ITS-M------------",
                     "dynamicBase":"*_ss",
                     "docs":76900},
                   "cache":{
                     "type":"string",
                     "schema":"--SD------------l"},
                   "category_rss":{
                     "type":"lowercase",
                     "schema":"ITS-M------------",
                     "docs":2654},
                   "chemical_agents_hl":{
                     "type":"lowercase",
                     "schema":"-TS-M------------",
                     "dynamicBase":"*_hl"},
                   "chemical_agents_os":{
                     "type":"string",
                     "schema":"---DM-----------l",
                     "dynamicBase":"*_os"},
                   "chemical_agents_ss":{
                     "type":"lowercase",
                     "schema":"ITS-M------------",
                     "dynamicBase":"*_ss",
                     "docs":2908},
                   "content":{
                     "type":"text_general",
                     "schema":"ITS--------------",
                     "docs":956905},
                   "contentLength":{
                     "type":"long",
                     "schema":"--SD-------------"},
                   "content_ar":{
                     "type":"text_ar",
                     "schema":"IT---------------"},
                   "content_de":{
                     "type":"text_de",
                     "schema":"IT---------------",
                     "index":"(unstored field)",
                     "docs":20},
                   "content_en":{
                     "type":"text_en",
                     "schema":"IT---------------",
                     "docs":11659},
                   "content_es":{
                     "type":"text_es",
                     "schema":"IT---------------",
                     "index":"(unstored field)",
                     "docs":8},
                   "content_fr":{
                     "type":"text_fr",
                     "schema":"IT---------------",
                     "index":"(unstored field)",
                     "docs":9},
                   "content_it":{
                     "type":"text_it",
                     "schema":"IT---------------",
                     "index":"(unstored field)",
                     "docs":11},
                   "content_pt":{
                     "type":"text_pt",
                     "schema":"IT---------------",
                     "index":"(unstored field)",
                     "docs":1},
                   "core_s":{
                     "type":"string",
                     "schema":"I-SD-----OF-----l",
                     "dynamicBase":"*_s",
                     "index":"ITS------OF------",
                     "docs":977933},
                   "crime_fl":{
                     "type":"hierarchic_lowertext",
                     "schema":"IT--M------------",
                     "dynamicBase":"*_fl",
                     "docs":88},
                   "crime_hl_fl":{
                     "type":"hierarchic_lowertext",
                     "schema":"IT--M------------",
                     "dynamicBase":"*_fl",
                     "docs":88},
                   "crime_tax_fl":{
                     "type":"hierarchic_lowertext",
                     "schema":"IT--M------------",
                     "dynamicBase":"*_fl",
                     "docs":87460},
        "crime_tax_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":87460},
                    "criminal_organisations_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "criminal_organisations_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "criminal_organisations_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":3402},
                    "critical_infrastructures_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "critical_infrastructures_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "critical_infrastructures_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":44695},
                    "cyb_tax_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":20865},
                    "cyb_tax_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":20865},
                    "cyber_attacks_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "cyber_attacks_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "cyber_attacks_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":4821},
                    "cyber_illegal_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":15},
                    "cyber_illegal_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "cyber_illegal_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":15},
                    "cyber_illegal_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "cyber_illegal_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":6743},
                    "digest":{
                      "type":"string",
                      "schema":"I-SD-----OF-----l",
                      "docs":977932},
                    "dl_update_date_dt":{
                      "type":"date",
                      "schema":"I-SD-----OF------",
                      "dynamicBase":"*_dt",
                      "docs":800029},
                    "doc_pages_chunks":{
                      "type":"text_general",
                      "schema":"-TS-M------------",
                      "dynamicBase":"doc_*"},
                    "duplicate_hash":{
                      "type":"lowercase",
                      "schema":"ITS--------------",
                      "docs":796454},
                    "elaboration_elapsedtime":{
                      "type":"long",
                      "schema":"I-SD-----OF------",
                      "docs":811860},
                    "emotions_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":73},
                    "emotions_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":73},
                    "emotions_tax_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":91014},
                    "emotions_tax_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":91014},
                    "error_result":{
                      "type":"text_general",
                      "schema":"ITS--------------",
                      "docs":114329},
                    "essex_id":{
                      "type":"identitycase",
                      "schema":"ITS--------------",
                      "docs":811860},
                    "ew_devices_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "ew_devices_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "ew_devices_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":3441},
                    "fact_crime":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":88},
                    "fact_crime_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":88},
                    "fact_crime_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":87460},
                    "fact_crime_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":87460},
                    "fact_cyb_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":20865},
                    "fact_cyb_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":20865},
                    "fact_cyber_illegal":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":15},
                    "fact_cyber_illegal_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":15},
                    "fact_emotions":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":73},
                    "fact_emotions_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":73},
                    "fact_emotions_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":91014},
                    "fact_emotions_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":91014},
                    "fact_geo":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":112},
                    "fact_geo_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":112},
                    "fact_geo_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":234055},
                    "fact_geo_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":234055},
                    "fact_intelligence":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":127},
                    "fact_intelligence_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":127},
                    "fact_intelligence_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":421517},
                    "fact_intelligence_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":421517},
                    "fact_terrorism":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":30},
                    "fact_terrorism_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":30},
                    "fact_terrorism_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":28685},
                    "fact_terrorism_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"fact_*",
                      "docs":28685},
                    "facts_domain_crime":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":88},
                    "facts_domain_crime_tax":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":87460},
                    "facts_domain_cyb_tax":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":20865},
                    "facts_domain_cyber_illegal":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":15},
                    "facts_domain_emotions":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":73},
                    "facts_domain_emotions_tax":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":91014},
                    "facts_domain_geo":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":112},
                    "facts_domain_geo_tax":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":234055},
                    "facts_domain_intelligence":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":127},
                    "facts_domain_intelligence_tax":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":421517},
                    "facts_domain_terrorism":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":30},
                    "facts_domain_terrorism_tax":{
                      "type":"identitycase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"facts_domain_*",
                      "docs":28685},
                    "followers":{
                      "type":"long",
                      "schema":"I-SD-----OF------",
                      "docs":763357},
                    "following":{
                      "type":"long",
                      "schema":"I-SD-----OF------",
                      "docs":763357},
                    "geo":{
                      "type":"location_rpt",
                      "schema":"I-S-M-----F------",
                      "docs":226289},
                    "geo_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":112},
                    "geo_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":112},
                    "geo_mapping_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "geo_mapping_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "geo_mapping_s":{
                      "type":"string",
                      "schema":"I-SD-----OF-----l",
                      "dynamicBase":"*_s",
                      "docs":6994},
                    "geo_mapping_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":226289},
                    "geo_s":{
                      "type":"string",
                      "schema":"I-SD-----OF-----l",
                      "dynamicBase":"*_s",
                      "docs":10},
                    "geo_tax_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":234055},
                    "geo_tax_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":234055},
                    "hasRelation":{
                      "type":"boolean",
                      "schema":"I-S------OF-----l",
                      "docs":115241},
                    "hash_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "hash_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "hash_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":1},
                    "hashtag_jss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_jss",
                      "docs":82914},
                    "host":{
                      "type":"url",
                      "schema":"IT---------------",
                      "index":"(unstored field)",
                      "docs":19},
                    "html_description":{
                      "type":"string",
                      "schema":"--SD------------l"},
                    "html_image":{
                      "type":"string",
                      "schema":"--SD------------l"},
                    "html_title":{
                      "type":"string",
                      "schema":"--SD------------l"},
                    "id":{
                      "type":"string",
                      "schema":"I-SD-----OF-----l",
                      "docs":977933},
                    "illicit_drugs_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "illicit_drugs_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "illicit_drugs_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":4402},
                    "image":{
                      "type":"text_general",
                      "schema":"ITS--------------",
                      "docs":763357},
                    "influential_people_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "influential_people_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "influential_people_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":112485},
                    "intelligence_agencies_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "intelligence_agencies_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "intelligence_agencies_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":10682},
                    "intelligence_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":127},
                    "intelligence_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":127},
                    "intelligence_tax_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":421517},
                    "intelligence_tax_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":421517},
                    "ip_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "ip_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "ip_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":5},
                    "key_company_executives_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "key_company_executives_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "key_company_executives_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":664},
                    "lang":{
                      "type":"string",
                      "schema":"I-SD-----OF-----l",
                      "docs":977933},
                    "lang_orig":{
                      "type":"identitycase",
                      "schema":"ITS--------------",
                      "docs":811860},
                    "lastModified":{
                      "type":"date",
                      "schema":"--SD-------------"},
                    "last_update":{
                      "type":"date",
                      "schema":"I-SD-----OF------",
                      "docs":811942},
                    "main_elements":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "docs":686418},
                    "main_elements_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "malware_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "malware_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "malware_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":3930},
                    "medical_conditions_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "medical_conditions_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "medical_conditions_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":18210},
                    "medical_treatments_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "medical_treatments_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "medical_treatments_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":5581},
                    "mention_jss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_jss",
                      "docs":759387},
                    "military_actions_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "military_actions_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "military_actions_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":21966},
                    "military_equipment_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "military_equipment_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "military_equipment_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":21265},
                    "military_facilities_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "military_facilities_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "military_facilities_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":382},
                    "military_forces_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "military_forces_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "military_forces_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":25741},
                    "natural_disasters_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "natural_disasters_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "natural_disasters_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":4364},
                    "non_governative_organisations_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "non_governative_organisations_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "non_governative_organisations_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":6282},
                    "organizations_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "organizations_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "organizations_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":241893},
                    "people_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "people_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "people_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":434153},
                    "places_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "places_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "places_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":223161},
                    "points_of_interest_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "points_of_interest_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "points_of_interest_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":9761},
                    "priority":{
                      "type":"double",
                      "schema":"I-SD-----OF------",
                      "docs":796453},
                    "public_leading_companies_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "public_leading_companies_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "public_leading_companies_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":48858},
                    "publishedDate":{
                      "type":"date",
                      "schema":"I-SD-----OF------",
                      "docs":973358},
                    "related_documents":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "index":"ITS--------------",
                      "docs":157959},
                    "relations":{
                      "type":"text_general",
                      "schema":"ITS--------------",
                      "docs":115241},
                    "relations_actions":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "docs":115241},
                    "relations_actions_oc":{
                      "type":"identitycase",
                      "schema":"IT--M------------",
                      "docs":115241},
                    "relations_entities":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "docs":115241},
                    "relations_entities_oc":{
                      "type":"identitycase",
                      "schema":"IT--M------------",
                      "docs":115241},
                    "schema_org_claimReviewed":{
                      "type":"text_general",
                      "schema":"ITS-M------------",
                      "docs":39},
                    "schema_org_cr_author_n3":{
                      "type":"string",
                      "schema":"I-SDM----OF-----l",
                      "docs":39},
                    "schema_org_cr_author_name":{
                      "type":"text_general",
                      "schema":"ITS-M------------",
                      "docs":39},
                    "schema_org_cr_author_url":{
                      "type":"string",
                      "schema":"I-SDM----OF-----l",
                      "docs":39},
                    "schema_org_cr_datePublished":{
                      "type":"tdate",
                      "schema":"I-SDM----OF------",
                      "docs":39},
                    "schema_org_cr_itemReviewed_n3":{
                      "type":"string",
                      "schema":"I-SDM----OF-----l",
                      "docs":39},
                    "schema_org_cr_n3":{
                      "type":"string",
                      "schema":"I-SDM----OF-----l",
                      "docs":39},
                    "schema_org_cr_rating_altName":{
                      "type":"text_general",
                      "schema":"ITS-M------------",
                      "docs":39},
                    "schema_org_cr_rating_best":{
                      "type":"tlong",
                      "schema":"I-SDM----OF------",
                      "docs":19},
                    "schema_org_cr_rating_image":{
                      "type":"string",
                      "schema":"I-SDM----OF-----l",
                      "docs":39},
                    "schema_org_cr_rating_value":{
                      "type":"tlong",
                      "schema":"I-SDM----OF------",
                      "docs":19},
                    "schema_org_cr_rating_worst":{
                      "type":"tlong",
                      "schema":"I-SDM----OF------",
                      "docs":19},
                    "schema_org_cr_url":{
                      "type":"string",
                      "schema":"I-SDM----OF-----l",
                      "docs":39},
                    "security_tools_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "security_tools_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "security_tools_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":102},
                    "segment":{
                      "type":"string",
                      "schema":"--SD------------l"},
                    "sentiments":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "docs":127085},
                    "sentiments_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "sentiments_mapping":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "docs":127085},
                    "size":{
                      "type":"long",
                      "schema":"I-SD-----OF------",
                      "docs":811860},
                    "social_tags_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "social_tags_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "social_tags_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":399477},
                    "source":{
                      "type":"text_general",
                      "schema":"ITS--------------",
                      "docs":977932},
                    "source_id":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "docs":977932},
                    "status":{
                      "type":"text_general",
                      "schema":"ITS--------------",
                      "docs":977933},
                    "structured_data":{
                      "type":"string",
                      "schema":"I-SDM----OF-----l",
                      "docs":303},
                    "submitted_time":{
                      "type":"date",
                      "schema":"I-SD-----OF------",
                      "docs":977933},
                    "taxonomy_crime":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":91},
                    "taxonomy_crime_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":91},
                    "taxonomy_crime_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":105782},
                    "taxonomy_crime_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":105782},
                    "taxonomy_cyb_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":26350},
                    "taxonomy_cyb_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":26350},
                    "taxonomy_cyber_illegal":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":20},
                    "taxonomy_cyber_illegal_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":20},
                    "taxonomy_emotions":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":91},
                    "taxonomy_emotions_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":91},
                    "taxonomy_emotions_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":126994},
                    "taxonomy_emotions_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":126994},
                    "taxonomy_geo":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":112},
                    "taxonomy_geo_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":112},
                    "taxonomy_geo_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":237001},
                    "taxonomy_geo_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":237001},
                    "taxonomy_intelligence":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":131},
                    "taxonomy_intelligence_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":131},
                    "taxonomy_intelligence_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":483883},
                    "taxonomy_intelligence_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":483883},
                    "taxonomy_terrorism":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":32},
                    "taxonomy_terrorism_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":32},
                    "taxonomy_terrorism_tax":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":33362},
                    "taxonomy_terrorism_tax_hl":{
                      "type":"hierarchic_text",
                      "schema":"ITS-M------------",
                      "dynamicBase":"taxonomy_*",
                      "docs":33362},
                    "tenant":{
                      "type":"text_general",
                      "schema":"ITS--------------",
                      "docs":817729},
                    "terrorism_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":30},
                    "terrorism_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":30},
                    "terrorism_tax_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":28685},
                    "terrorism_tax_hl_fl":{
                      "type":"hierarchic_lowertext",
                      "schema":"IT--M------------",
                      "dynamicBase":"*_fl",
                      "docs":28685},
                    "terrorist_organisations_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "terrorist_organisations_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "terrorist_organisations_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":13660},
                    "title":{
                      "type":"text_general",
                      "schema":"ITS--------------",
                      "docs":975107},
                    "title_ar":{
                      "type":"text_ar",
                      "schema":"IT---------------"},
                    "title_de":{
                      "type":"text_de",
                      "schema":"IT---------------",
                      "index":"(unstored field)",
                      "docs":20},
                    "title_en":{
                      "type":"text_en",
                      "schema":"IT---------------",
                      "index":"(unstored field)",
                      "docs":11661},
                    "title_es":{
                      "type":"text_es",
                      "schema":"IT---------------",
                      "index":"(unstored field)",
                      "docs":8},
                    "title_fr":{
                      "type":"text_fr",
                      "schema":"IT---------------",
                      "index":"(unstored field)",
                      "docs":9},
                    "title_it":{
                      "type":"text_it",
                      "schema":"IT---------------",
                      "index":"(unstored field)",
                      "docs":11},
                    "title_pt":{
                      "type":"text_pt",
                      "schema":"IT---------------",
                      "index":"(unstored field)",
                      "docs":1},
                    "translateDocument":{
                      "type":"text_general",
                      "schema":"-TS--------------"},
                    "tstamp":{
                      "type":"date",
                      "schema":"--SD-------------"},
                    "tweets":{
                      "type":"long",
                      "schema":"I-SD-----OF------",
                      "docs":763357},
                    "type":{
                      "type":"string",
                      "schema":"I-SD-----OF-----l",
                      "docs":796452},
                    "type_nutch":{
                      "type":"string",
                      "schema":"I-SDM----OF-----l",
                      "docs":181478},
                    "url":{
                      "type":"url",
                      "schema":"ITS--------------",
                      "docs":977932},
                    "us_senators_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "us_senators_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "us_senators_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":17180},
                    "vehicles_cars_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "vehicles_cars_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "vehicles_cars_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":5414},
                    "vehicles_motorbikes_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "vehicles_motorbikes_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "vehicles_motorbikes_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":56},
                    "vulnerabilities_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "vulnerabilities_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "vulnerabilities_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":6548},
                    "wanted_for_terrorism_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "wanted_for_terrorism_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "wanted_for_terrorism_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":641},
                    "weapons_of_mass_destruction_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "weapons_of_mass_destruction_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "weapons_of_mass_destruction_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":2788},
                    "world_leaders_hl":{
                      "type":"lowercase",
                      "schema":"-TS-M------------",
                      "dynamicBase":"*_hl"},
                    "world_leaders_os":{
                      "type":"string",
                      "schema":"---DM-----------l",
                      "dynamicBase":"*_os"},
                    "world_leaders_ss":{
                      "type":"lowercase",
                      "schema":"ITS-M------------",
                      "dynamicBase":"*_ss",
                      "docs":127914}},
                  "info":{
                    "key":{
                      "I":"Indexed",
                      "T":"Tokenized",
                      "S":"Stored",
                      "D":"DocValues",
                      "M":"Multivalued",
                      "V":"TermVector Stored",
                      "o":"Store Offset With TermVector",
                      "p":"Store Position With TermVector",
                      "y":"Store Payloads With TermVector",
                      "O":"Omit Norms",
                      "F":"Omit Term Frequencies & Positions",
                      "P":"Omit Positions",
                      "H":"Store Offsets with Positions",
                      "L":"Lazy",
                      "B":"Binary",
                      "f":"Sort Missing First",
                      "l":"Sort Missing Last"},
                    "NOTE":"Document Frequency (df) is not updated when a document is marked for deletion.  df values include deleted documents."}}
```

```
                GET http://192.168.192.163:8984/solr/70e9e133-52b5-4195-8b43-1aa737cd26de/admin/luke?numTerms=0&wt=json&indent=on
                HTTP/1.1 200 OK
                Cache-Control: no-cache, no-store
                Pragma: no-cache
                Expires: Sat, 01 Jan 2000 01:00:00 GMT
                Last-Modified: Tue, 21 Jan 2020 09:56:27 GMT
                ETag: "16fc78829d1"
                Content-Type: text/plain;charset=utf-8
                Transfer-Encoding: chunked
                Request duration: 0.481999s
```


2.  `select` is the main searching call
    I've added params
    
    -   `indent` to pretty print the output and
    -   `rows=0` to avoid retrieving individual documents, which are not really necessary unless you want to show details about specific documents (by default, Solr returns 10 documents)
    
        GET http://192.168.192.163:8984/solr/70e9e133-52b5-4195-8b43-1aa737cd26de/select?q=*%3A*&fq=publishedDate:[2018-07-10T16:00:25.000Z%20TO%202020-01-20T16:22:59.000Z]&fq=lang_orig:"en"&facet=true&facet.field=lang_orig&facet.field=taxonomy_crime_tax&facet.field=people_os&wt=json&indent=on&rows=0
    
    RESULTS:
``` json
        {
          "responseHeader":{
            "zkConnected":true,
            "status":0,
            "QTime":75,
            "params":{
              "q":"*:*",
              "facet.field":["lang_orig",
                "taxonomy_crime_tax",
                "people_os"],
              "indent":"on",
              "fq":["publishedDate:[2018-07-10T16:00:25.000Z TO 2020-01-20T16:22:59.000Z]",
                "lang_orig:\"en\""],
              "rows":"0",
              "facet":"true",
              "wt":"json"}},
          "response":{"numFound":749447,"start":0,"docs":[]
          },
          "facet_counts":{
            "facet_queries":{},
            "facet_fields":{
              "lang_orig":[
                "en",749447,
                "af",0,
                "ar",0,
                "bg",0,
                "bn",0,
                "cs",0,
                "da",0,
                "de",0,
                "el",0,
                "es",0,
                "et",0,
                "fa",0,
                "fi",0,
                "fr",0,
                "gu",0,
                "he",0,
                "hi",0,
                "hr",0,
                "hu",0,
                "id",0,
                "it",0,
                "ja",0,
                "kn",0,
                "ko",0,
                "lt",0,
                "lv",0,
                "mk",0,
                "ml",0,
                "mr",0,
                "nl",0,
                "no",0,
                "pl",0,
                "pt",0,
                "ro",0,
                "ru",0,
                "sk",0,
                "sl",0,
                "so",0,
                "sq",0,
                "sv",0,
                "sw",0,
                "ta",0,
                "te",0,
                "th",0,
                "tl",0,
                "tr",0,
                "uk",0,
                "ur",0,
                "vi",0,
                "zh-cn",0,
                "zh-tw",0],
              "taxonomy_crime_tax":[
                "/CRIME_TAX",96667,
                "/CRIME_TAX/33400000",55276,
                "/CRIME_TAX/33400000/33400300",31118,
                "/CRIME_TAX/33400000/33400400",26141,
                "/CRIME_TAX/33400000/33400200",21711,
                "/CRIME_TAX/33400000/33400400/33400401",18037,
                "/CRIME_TAX/32400000",15665,
                "/CRIME_TAX/31400000",13691,
                "/CRIME_TAX/32600000",11055,
                "/CRIME_TAX/32000000",9996,
                "/CRIME_TAX/33000000",9413,
                "/CRIME_TAX/32700000",7133,
                "/CRIME_TAX/33500000",7118,
                "/CRIME_TAX/33500000/33500100",7118,
                "/CRIME_TAX/32000000/32000100",6834,
                "/CRIME_TAX/32600000/32600100",6055,
                "/CRIME_TAX/31000000",5533,
                "/CRIME_TAX/32700000/32700100",5134,
                "/CRIME_TAX/32200000",5033,
                "/CRIME_TAX/33400000/33400100",4559,
                "/CRIME_TAX/31300000",4510,
                "/CRIME_TAX/33400000/33400300/33400302",3800,
                "/CRIME_TAX/32200000/32200100",3786,
                "/CRIME_TAX/32600000/32600500",3228,
                "/CRIME_TAX/31600000",3176,
                "/CRIME_TAX/33400000/33400300/33400301",2807,
                "/CRIME_TAX/33400000/33400500",2577,
                "/CRIME_TAX/33400000/33400500/33400501",2556,
                "/CRIME_TAX/31700000",2412,
                "/CRIME_TAX/33400000/33400400/33400402",2319,
                "/CRIME_TAX/31000000/31000100",2168,
                "/CRIME_TAX/32200000/32200200",2137,
                "/CRIME_TAX/31500000",2076,
                "/CRIME_TAX/32500000",2038,
                "/CRIME_TAX/31100000",2019,
                "/CRIME_TAX/32800000",2018,
                "/CRIME_TAX/32000000/32000200",1912,
                "/CRIME_TAX/31300000/31300100",1871,
                "/CRIME_TAX/32600000/32600200",1851,
                "/CRIME_TAX/31200000",1770,
                "/CRIME_TAX/32500000/32500100",1747,
                "/CRIME_TAX/31300000/31300300",1725,
                "/CRIME_TAX/32100000",1712,
                "/CRIME_TAX/31700000/31700100",1659,
                "/CRIME_TAX/32300000",1495,
                "/CRIME_TAX/32600000/32600700",1489,
                "/CRIME_TAX/33500000/33500100/33500103",1429,
                "/CRIME_TAX/31800000",1409,
                "/CRIME_TAX/32700000/32700400",1396,
                "/CRIME_TAX/31000000/31000500",1122,
                "/CRIME_TAX/33500000/33500100/33500101",1086,
                "/CRIME_TAX/32600000/32600600",1076,
                "/CRIME_TAX/31000000/31000700",958,
                "/CRIME_TAX/33100000",922,
                "/CRIME_TAX/32700000/32700300",855,
                "/CRIME_TAX/32600000/32600800",849,
                "/CRIME_TAX/31000000/31000200",768,
                "/CRIME_TAX/31900000",746,
                "/CRIME_TAX/31200000/31200100",683,
                "/CRIME_TAX/31300000/31300400",651,
                "/CRIME_TAX/31000000/31000300",518,
                "/CRIME_TAX/31300000/31300500",515,
                "/CRIME_TAX/32600000/32600400",501,
                "/CRIME_TAX/31300000/31300200",429,
                "/CRIME_TAX/33500000/33500100/33500102",402,
                "/CRIME_TAX/32900000",336,
                "/CRIME_TAX/32500000/32500200",320,
                "/CRIME_TAX/31000000/31000600",247,
                "/CRIME_TAX/32700000/32700200",240,
                "/CRIME_TAX/33400000/33400300/33400303",161,
                "/CRIME_TAX/33200000",158,
                "/CRIME_TAX/31000000/31000400",123,
                "/CRIME_TAX/32600000/32600900",63,
                "/CRIME_TAX/31700000/31700200",58,
                "/CRIME_TAX/32700000/32700600",30,
                "/CRIME_TAX/32700000/32700500",26,
                "/CRIME_TAX/32600000/32600300",15,
                "/CRIME_TAX/33400000/33400500/33400502",14,
                "/CRIME_TAX/33400000/33400500/33400503",11,
                "/CRIME_TAX/33300000",6],
              "people_os":[
                "Donald Trump",73337,
                "Boris Johnson",32360,
                "Barack Obama",17923,
                "Joe Biden",9770,
                "Keir Starmer",7402,
                "Fiona Bruce",7133,
                "Jeremy Corbyn",5933,
                "Paul Ryan",5559,
                "Hillary Clinton",5100,
                "Bernie Sanders",4979,
                "Nancy Pelosi",4323,
                "Politifact",4308,
                "Theresa May",4052,
                "George W. Bush",3570,
                "Biden",3435,
                "Speaker",3198,
                "Dominic Raab",3150,
                "Elizabeth Warren",3100,
                "Jo Swinson",3086,
                "Nicola Sturgeon",3060,
                "Kamala D. Harris",2890,
                "Vladimir Putin",2728,
                "David Cameron",2726,
                "Johnson",2582,
                "Will Moy",2097,
                "Michael Brown",2076,
                "Steve Smith",2009,
                "Cory A. Booker",1914,
                "Clarke",1890,
                "Gary McKinnon",1859,
                "Louis Jacobson",1851,
                "David Davis",1782,
                "Robert Mueller",1778,
                "David",1767,
                "Mike Webb",1714,
                "Adam Schiff",1703,
                "Jess Phillips",1663,
                "Ronald Reagan",1662,
                "Andrew Yang",1583,
                "Bill Clinton",1566,
                "John Fitzgerald Kennedy",1534,
                "Ilhan Omar",1530,
                "Matt Hancock",1529,
                "Bill Gates",1451,
                "Accedi",1409,
                "Nigel Farage",1389,
                "Tony Blair",1354,
                "Caroline Lucas",1348,
                "Hilary Benn",1348,
                "Sajid Javid",1334,
                "Anna Soubry",1271,
                "Warren Buffett",1261,
                "Jeff Bezos",1250,
                "Adolf Hitler",1224,
                "Donald J. Trump",1224,
                "Scott Walker",1217,
                "Winston Churchill",1177,
                "Annulla Annulla",1143,
                "Ted Cruz",1138,
                "Graham Brady",1132,
                "Rick Scott",1121,
                "Juncker",1120,
                "Wollaston",1113,
                "Erasmus",1105,
                "David Vaporium",1104,
                "Michael Cohen",1066,
                "Eric Trump",1062,
                "Mike Pence",1050,
                "Ruth Davidson",1050,
                "Daniel Funke",1012,
                "John Kerry",1012,
                "Pelosi",992,
                "Rees-Mogg",987,
                "Yvette Cooper",986,
                "Fox",984,
                "Emmanuel Macron",981,
                "Amy Sherman",959,
                "Jon Greenberg",956,
                "Jamal Khashoggi",945,
                "Kate Hoey",939,
                "Neville Chamberlain",935,
                "Mitt Romney",924,
                "Mark Zuckerberg",907,
                "Tom Kertscher",907,
                "Neil Gorsuch",886,
                "Angie Drobnic Holan",883,
                "WiredUK",875,
                "Jacob",870,
                "Francois",863,
                "Martin Luther King",858,
                "Bashar al-Assad",853,
                "Lammy",851,
                "Daniel",846,
                "Luke Graham",844,
                "Mitch McConnell",843,
                "Edward Leigh",842,
                "Jeff Sessions",839,
                "Mueller",839,
                "Merrick Garland",835,
                "McVey",834]},
            "facet_ranges":{},
            "facet_intervals":{},
            "facet_heatmaps":{}}}
```

```
        GET http://192.168.192.163:8984/solr/70e9e133-52b5-4195-8b43-1aa737cd26de/select?q=*%3A*&fq=publishedDate:[2018-07-10T16:00:25.000Z%20TO%202020-01-20T16:22:59.000Z]&fq=lang_orig:"en"&facet=true&facet.field=lang_orig&facet.field=taxonomy_crime_tax&facet.field=people_os&wt=json&indent=on&rows=0
        HTTP/1.1 200 OK
        Content-Type: text/plain;charset=utf-8
        Content-Length: 7726
        Request duration: 0.362004s
```

3.  `admin/cores` 
    I guess this is to get a list of all collections?
    
        GET http://192.168.192.163:8984/solr/admin/cores?action=STATUS&wt=json&omitHeader=true&indent=on
    
    RESULTS:
    
``` json
        {
          "initFailures": null,
          "status": {
            "2bd20c89-9b70-46e2-aad7-108337db80e6_shard1_replica1": {
              "name": "2bd20c89-9b70-46e2-aad7-108337db80e6_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/2bd20c89-9b70-46e2-aad7-108337db80e6_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/2bd20c89-9b70-46e2-aad7-108337db80e6_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:29.543Z",
              "uptime": 335871443,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "2bd20c89-9b70-46e2-aad7-108337db80e6",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 3,
                "maxDoc": 3,
                "deletedDocs": 0,
                "indexHeapUsageBytes": -1,
                "version": 16,
                "segmentCount": 1,
                "current": true,
                "hasDeletions": false,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/2bd20c89-9b70-46e2-aad7-108337db80e6_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_3",
                "segmentsFileSizeInBytes": 165,
                "userData": {
                  "commitTimeMSec": "1548717989762"
                },
                "lastModified": "2019-01-28T23:26:29.762Z",
                "sizeInBytes": 106567,
                "size": "104.07 KB"
              }
            },
            "34f73d18-b494-45c7-8294-a5e43b7d9efe_shard1_replica1": {
              "name": "34f73d18-b494-45c7-8294-a5e43b7d9efe_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/34f73d18-b494-45c7-8294-a5e43b7d9efe_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/34f73d18-b494-45c7-8294-a5e43b7d9efe_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:29.451Z",
              "uptime": 335871536,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "34f73d18-b494-45c7-8294-a5e43b7d9efe",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 1516,
                "maxDoc": 1536,
                "deletedDocs": 20,
                "indexHeapUsageBytes": -1,
                "version": 218,
                "segmentCount": 6,
                "current": true,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/34f73d18-b494-45c7-8294-a5e43b7d9efe_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_13",
                "segmentsFileSizeInBytes": 479,
                "userData": {
                  "commitTimeMSec": "1564046783089"
                },
                "lastModified": "2019-07-25T09:26:23.089Z",
                "sizeInBytes": 55353822,
                "size": "52.79 MB"
              }
            },
            "37a0ab9f-d52d-450e-b83b-80610d9bef19_shard1_replica1": {
              "name": "37a0ab9f-d52d-450e-b83b-80610d9bef19_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/37a0ab9f-d52d-450e-b83b-80610d9bef19_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/37a0ab9f-d52d-450e-b83b-80610d9bef19_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:29.448Z",
              "uptime": 335871541,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "37a0ab9f-d52d-450e-b83b-80610d9bef19",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 1,
                "maxDoc": 4,
                "deletedDocs": 3,
                "indexHeapUsageBytes": -1,
                "version": 77,
                "segmentCount": 1,
                "current": true,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/37a0ab9f-d52d-450e-b83b-80610d9bef19_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_b",
                "segmentsFileSizeInBytes": 165,
                "userData": {
                  "commitTimeMSec": "1550677129850"
                },
                "lastModified": "2019-02-20T15:38:49.850Z",
                "sizeInBytes": 202325,
                "size": "197.58 KB"
              }
            },
            "483f1002-969e-49d1-9bcd-f1d937617e32_shard1_replica1": {
              "name": "483f1002-969e-49d1-9bcd-f1d937617e32_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/483f1002-969e-49d1-9bcd-f1d937617e32_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/483f1002-969e-49d1-9bcd-f1d937617e32_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:33.423Z",
              "uptime": 335867566,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "483f1002-969e-49d1-9bcd-f1d937617e32",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 35410,
                "maxDoc": 41842,
                "deletedDocs": 6432,
                "indexHeapUsageBytes": -1,
                "version": 44262,
                "segmentCount": 23,
                "current": false,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/483f1002-969e-49d1-9bcd-f1d937617e32_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_yy",
                "segmentsFileSizeInBytes": 1192,
                "userData": {
                  "commitTimeMSec": "1579577771388"
                },
                "lastModified": "2020-01-21T03:36:11.388Z",
                "sizeInBytes": 586896601,
                "size": "559.71 MB"
              }
            },
            "4a9bd25d-b952-4704-b392-dbbdc1182203_shard1_replica1": {
              "name": "4a9bd25d-b952-4704-b392-dbbdc1182203_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/4a9bd25d-b952-4704-b392-dbbdc1182203_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/4a9bd25d-b952-4704-b392-dbbdc1182203_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:33.470Z",
              "uptime": 335867522,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "4a9bd25d-b952-4704-b392-dbbdc1182203",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 7652,
                "maxDoc": 7700,
                "deletedDocs": 48,
                "indexHeapUsageBytes": -1,
                "version": 12222,
                "segmentCount": 13,
                "current": false,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/4a9bd25d-b952-4704-b392-dbbdc1182203_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_i0",
                "segmentsFileSizeInBytes": 808,
                "userData": {
                  "commitTimeMSec": "1579584556351"
                },
                "lastModified": "2020-01-21T05:29:16.351Z",
                "sizeInBytes": 144020255,
                "size": "137.35 MB"
              }
            },
            "70e9e133-52b5-4195-8b43-1aa737cd26de_shard1_replica1": {
              "name": "70e9e133-52b5-4195-8b43-1aa737cd26de_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/70e9e133-52b5-4195-8b43-1aa737cd26de_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/70e9e133-52b5-4195-8b43-1aa737cd26de_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:33.391Z",
              "uptime": 335867601,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "70e9e133-52b5-4195-8b43-1aa737cd26de",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 811794,
                "maxDoc": 977953,
                "deletedDocs": 166159,
                "indexHeapUsageBytes": -1,
                "version": 336973,
                "segmentCount": 20,
                "current": false,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/70e9e133-52b5-4195-8b43-1aa737cd26de_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_ai7",
                "segmentsFileSizeInBytes": 1600,
                "userData": {
                  "commitTimeMSec": "1579592424892"
                },
                "lastModified": "2020-01-21T07:40:24.892Z",
                "sizeInBytes": 5716537837,
                "size": "5.32 GB"
              }
            },
            "b93eeaa2-ebd3-4dd2-b54a-4dacc742373b_shard1_replica1": {
              "name": "b93eeaa2-ebd3-4dd2-b54a-4dacc742373b_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/b93eeaa2-ebd3-4dd2-b54a-4dacc742373b_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/b93eeaa2-ebd3-4dd2-b54a-4dacc742373b_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:37.281Z",
              "uptime": 335863711,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "b93eeaa2-ebd3-4dd2-b54a-4dacc742373b",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 42038,
                "maxDoc": 42091,
                "deletedDocs": 53,
                "indexHeapUsageBytes": -1,
                "version": 55098,
                "segmentCount": 22,
                "current": false,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/b93eeaa2-ebd3-4dd2-b54a-4dacc742373b_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_10j",
                "segmentsFileSizeInBytes": 1257,
                "userData": {
                  "commitTimeMSec": "1579575597702"
                },
                "lastModified": "2020-01-21T02:59:57.702Z",
                "sizeInBytes": 434165676,
                "size": "414.05 MB"
              }
            },
            "bd764318-2ed9-4e9d-8ccd-632d68851280_shard1_replica1": {
              "name": "bd764318-2ed9-4e9d-8ccd-632d68851280_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/bd764318-2ed9-4e9d-8ccd-632d68851280_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/bd764318-2ed9-4e9d-8ccd-632d68851280_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:37.543Z",
              "uptime": 335863450,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "bd764318-2ed9-4e9d-8ccd-632d68851280",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 3,
                "maxDoc": 8,
                "deletedDocs": 5,
                "indexHeapUsageBytes": -1,
                "version": 44,
                "segmentCount": 2,
                "current": true,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/bd764318-2ed9-4e9d-8ccd-632d68851280_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_6",
                "segmentsFileSizeInBytes": 227,
                "userData": {
                  "commitTimeMSec": "1552410475132"
                },
                "lastModified": "2019-03-12T17:07:55.132Z",
                "sizeInBytes": 426856,
                "size": "416.85 KB"
              }
            },
            "c9d15399-799b-4d38-97ed-43cd628b6664_shard1_replica1": {
              "name": "c9d15399-799b-4d38-97ed-43cd628b6664_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/c9d15399-799b-4d38-97ed-43cd628b6664_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/c9d15399-799b-4d38-97ed-43cd628b6664_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:37.550Z",
              "uptime": 335863444,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "c9d15399-799b-4d38-97ed-43cd628b6664",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 266225,
                "maxDoc": 366142,
                "deletedDocs": 99917,
                "indexHeapUsageBytes": -1,
                "version": 121242,
                "segmentCount": 25,
                "current": false,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/c9d15399-799b-4d38-97ed-43cd628b6664_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_5lb",
                "segmentsFileSizeInBytes": 2103,
                "userData": {
                  "commitTimeMSec": "1579594840864"
                },
                "lastModified": "2020-01-21T08:20:40.864Z",
                "sizeInBytes": 5213750336,
                "size": "4.86 GB"
              }
            },
            "claims-dev_shard1_replica1": {
              "name": "claims-dev_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/claims-dev_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/claims-dev_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:42.107Z",
              "uptime": 335858887,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "claims-dev",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 77250,
                "maxDoc": 99729,
                "deletedDocs": 22479,
                "indexHeapUsageBytes": -1,
                "version": 64809,
                "segmentCount": 18,
                "current": false,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/claims-dev_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_5zo",
                "segmentsFileSizeInBytes": -1,
                "userData": {
                  "commitTimeMSec": "1579549822584"
                },
                "lastModified": "2020-01-20T19:50:22.584Z",
                "sizeInBytes": 580896835,
                "size": "553.99 MB"
              }
            },
            "co-inform.aw.local_shard1_replica1": {
              "name": "co-inform.aw.local_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/co-inform.aw.local_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/co-inform.aw.local_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:42.568Z",
              "uptime": 335858428,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "co-inform.aw.local",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 0,
                "maxDoc": 0,
                "deletedDocs": 0,
                "indexHeapUsageBytes": 0,
                "version": 2,
                "segmentCount": 0,
                "current": true,
                "hasDeletions": false,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/co-inform.aw.local_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_1",
                "segmentsFileSizeInBytes": 71,
                "userData": null,
                "sizeInBytes": 71,
                "size": "71 bytes"
              }
            },
            "collection1": {
              "name": "collection1",
              "instanceDir": "/opt/solr/data/server/solr/collection1",
              "dataDir": "/opt/solr/data/server/solr/collection1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:42.631Z",
              "uptime": 335858365,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "collection1",
                "shard": "shard2",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 0,
                "maxDoc": 0,
                "deletedDocs": 0,
                "indexHeapUsageBytes": 0,
                "version": 2,
                "segmentCount": 0,
                "current": true,
                "hasDeletions": false,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/collection1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_1",
                "segmentsFileSizeInBytes": 71,
                "userData": null,
                "sizeInBytes": 71,
                "size": "71 bytes"
              }
            },
            "d0f3a6d6-080b-46b4-a33b-088be9cfb840_shard1_replica1": {
              "name": "d0f3a6d6-080b-46b4-a33b-088be9cfb840_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/d0f3a6d6-080b-46b4-a33b-088be9cfb840_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/d0f3a6d6-080b-46b4-a33b-088be9cfb840_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:45.250Z",
              "uptime": 335855746,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "d0f3a6d6-080b-46b4-a33b-088be9cfb840",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 5986,
                "maxDoc": 7117,
                "deletedDocs": 1131,
                "indexHeapUsageBytes": -1,
                "version": 14673,
                "segmentCount": 9,
                "current": false,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/d0f3a6d6-080b-46b4-a33b-088be9cfb840_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_1a7",
                "segmentsFileSizeInBytes": 873,
                "userData": {
                  "commitTimeMSec": "1579597531956"
                },
                "lastModified": "2020-01-21T09:05:31.956Z",
                "sizeInBytes": 46241816,
                "size": "44.1 MB"
              }
            },
            "d33b99cf-131a-46a5-86e5-f583627998a7_shard1_replica1": {
              "name": "d33b99cf-131a-46a5-86e5-f583627998a7_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/d33b99cf-131a-46a5-86e5-f583627998a7_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/d33b99cf-131a-46a5-86e5-f583627998a7_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:45.494Z",
              "uptime": 335855503,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "d33b99cf-131a-46a5-86e5-f583627998a7",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 64668,
                "maxDoc": 85887,
                "deletedDocs": 21219,
                "indexHeapUsageBytes": -1,
                "version": 4532,
                "segmentCount": 25,
                "current": true,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/d33b99cf-131a-46a5-86e5-f583627998a7_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_kr",
                "segmentsFileSizeInBytes": 1678,
                "userData": {
                  "commitTimeMSec": "1564051843439"
                },
                "lastModified": "2019-07-25T10:50:43.439Z",
                "sizeInBytes": 1541293745,
                "size": "1.44 GB"
              }
            },
            "ee429e0e-655a-4b18-abc5-3553c59b09bb_shard1_replica1": {
              "name": "ee429e0e-655a-4b18-abc5-3553c59b09bb_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/ee429e0e-655a-4b18-abc5-3553c59b09bb_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/ee429e0e-655a-4b18-abc5-3553c59b09bb_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:45.254Z",
              "uptime": 335855744,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "ee429e0e-655a-4b18-abc5-3553c59b09bb",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 5314,
                "maxDoc": 5467,
                "deletedDocs": 153,
                "indexHeapUsageBytes": -1,
                "version": 199,
                "segmentCount": 10,
                "current": true,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/ee429e0e-655a-4b18-abc5-3553c59b09bb_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_f",
                "segmentsFileSizeInBytes": 732,
                "userData": {
                  "commitTimeMSec": "1563984798010"
                },
                "lastModified": "2019-07-24T16:13:18.010Z",
                "sizeInBytes": 98142105,
                "size": "93.6 MB"
              }
            },
            "f493a9ed-da66-4a9d-9605-a5501195eeef_shard1_replica1": {
              "name": "f493a9ed-da66-4a9d-9605-a5501195eeef_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/f493a9ed-da66-4a9d-9605-a5501195eeef_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/f493a9ed-da66-4a9d-9605-a5501195eeef_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:47.180Z",
              "uptime": 335853818,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "f493a9ed-da66-4a9d-9605-a5501195eeef",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 176139,
                "maxDoc": 186512,
                "deletedDocs": 10373,
                "indexHeapUsageBytes": -1,
                "version": 127104,
                "segmentCount": 31,
                "current": false,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/f493a9ed-da66-4a9d-9605-a5501195eeef_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_b02",
                "segmentsFileSizeInBytes": -1,
                "userData": {
                  "commitTimeMSec": "1579580880478"
                },
                "lastModified": "2020-01-21T04:28:00.478Z",
                "sizeInBytes": 3513834998,
                "size": "3.27 GB"
              }
            },
            "fd5b4a2f-45a7-4f72-8b76-9f7e8f96269f_shard1_replica1": {
              "name": "fd5b4a2f-45a7-4f72-8b76-9f7e8f96269f_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/fd5b4a2f-45a7-4f72-8b76-9f7e8f96269f_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/fd5b4a2f-45a7-4f72-8b76-9f7e8f96269f_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:48.447Z",
              "uptime": 335852552,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "fd5b4a2f-45a7-4f72-8b76-9f7e8f96269f",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 5746,
                "maxDoc": 6179,
                "deletedDocs": 433,
                "indexHeapUsageBytes": -1,
                "version": 21236,
                "segmentCount": 8,
                "current": false,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/fd5b4a2f-45a7-4f72-8b76-9f7e8f96269f_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_1mh",
                "segmentsFileSizeInBytes": -1,
                "userData": {
                  "commitTimeMSec": "1579551227564"
                },
                "lastModified": "2020-01-20T20:13:47.564Z",
                "sizeInBytes": 77403592,
                "size": "73.82 MB"
              }
            },
            "inform.aw.local_shard1_replica1": {
              "name": "inform.aw.local_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/inform.aw.local_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/inform.aw.local_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:50.416Z",
              "uptime": 335850584,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "inform.aw.local",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 2002,
                "maxDoc": 2738,
                "deletedDocs": 736,
                "indexHeapUsageBytes": -1,
                "version": 13169,
                "segmentCount": 20,
                "current": true,
                "hasDeletions": true,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/inform.aw.local_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_1d1",
                "segmentsFileSizeInBytes": 1385,
                "userData": {
                  "commitTimeMSec": "1579196965643"
                },
                "lastModified": "2020-01-16T17:49:25.643Z",
                "sizeInBytes": 498428254,
                "size": "475.34 MB"
              }
            },
            "public_sources_shard1_replica1": {
              "name": "public_sources_shard1_replica1",
              "instanceDir": "/opt/solr/data/server/solr/public_sources_shard1_replica1",
              "dataDir": "/opt/solr/data/server/solr/public_sources_shard1_replica1/data/",
              "config": "solrconfig.xml",
              "schema": "managed-schema",
              "startTime": "2020-01-17T13:11:50.423Z",
              "uptime": 335850577,
              "lastPublished": "active",
              "configVersion": 45,
              "cloud": {
                "collection": "public_sources",
                "shard": "shard1",
                "replica": "core_node1"
              },
              "index": {
                "numDocs": 0,
                "maxDoc": 0,
                "deletedDocs": 0,
                "indexHeapUsageBytes": 0,
                "version": 2,
                "segmentCount": 0,
                "current": true,
                "hasDeletions": false,
                "directory": "org.apache.lucene.store.NRTCachingDirectory:NRTCachingDirectory(MMapDirectory@/opt/solr/data/server/solr/public_sources_shard1_replica1/data/index lockFactory=org.apache.lucene.store.NativeFSLockFactory@5c445f57; maxCacheMB=48.0 maxMergeSizeMB=4.0)",
                "segmentsFile": "segments_1",
                "segmentsFileSizeInBytes": 71,
                "userData": null,
                "sizeInBytes": 71,
                "size": "71 bytes"
              }
            }
          }
        }
```

```
    // GET http://192.168.192.163:8984/solr/admin/cores?action=STATUS&wt=json&omitHeader=true&indent=on
        // HTTP/1.1 200 OK
        // Content-Type: application/json; charset=UTF-8
        // Content-Length: 26291
        // Request duration: 0.441958s
```

4.  other components call variations of the `/select` endpoint with specific parameters required by that component
    For example, the [hits](https://doc.lucidworks.com/lucidworks-hdpsearch/2.5/Guide-Banana.html#_hits-panel) Banana component uses the Solr [stats](https://lucene.apache.org/solr/guide/6_6/the-stats-component.html) component as follows:
    
        GET http://192.168.192.163:8984/solr/70e9e133-52b5-4195-8b43-1aa737cd26de/select?q=*%3A*&fq=publishedDate:[2018-07-10T16:00:25.000Z%20TO%202020-01-20T16:22:59.000Z]&fq=lang_orig:"en"&stats=true&stats.field=organizations_os&stats.field=places_os&stats.field=medical_conditions_os&stats.field=medical_treatments_os&wt=json&rows=0&indent=on
    
    RESULTS:

``` json
        {
          "responseHeader":{
            "zkConnected":true,
            "status":0,
            "QTime":197,
            "params":{
              "q":"*:*",
              "stats":"true",
              "indent":"on",
              "fq":["publishedDate:[2018-07-10T16:00:25.000Z TO 2020-01-20T16:22:59.000Z]",
                "lang_orig:\"en\""],
              "rows":"0",
              "wt":"json",
              "stats.field":["organizations_os",
                "places_os",
                "medical_conditions_os",
                "medical_treatments_os"]}},
          "response":{"numFound":749447,"start":0,"docs":[]
          },
          "stats":{
            "stats_fields":{
              "organizations_os":{
                "min":"'Ndrangheta",
                "max":"€oeThe",
                "count":736534,
                "missing":529310},
              "places_os":{
                "min":"'Afrin",
                "max":"Šumadija",
                "count":832735,
                "missing":553958},
              "medical_conditions_os":{
                "min":"A.I.D.S.",
                "max":"zoonosis",
                "count":30515,
                "missing":733358},
              "medical_treatments_os":{
                "min":"Swedish massage",
                "max":"water cure",
                "count":6975,
                "missing":744134}}}}
```

```
        GET http://192.168.192.163:8984/solr/70e9e133-52b5-4195-8b43-1aa737cd26de/select?q=*%3A*&fq=publishedDate:[2018-07-10T16:00:25.000Z%20TO%202020-01-20T16:22:59.000Z]&fq=lang_orig:"en"&stats=true&stats.field=organizations_os&stats.field=places_os&stats.field=medical_conditions_os&stats.field=medical_treatments_os&wt=json&rows=0&indent=on
        HTTP/1.1 200 OK
        Content-Type: text/plain;charset=utf-8
        Content-Length: 1059
        Request duration: 0.339002s
```

The `select` Solr endpoint can handle both `GET` and `POST` requests. From `curl` the query may look like this:

``` sh
        curl 'http://192.168.192.163:8984/solr/70e9e133-52b5-4195-8b43-1aa737cd26de/select' \
        -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0' \
        -H 'Accept: application/json, text/plain, */*' \
        -H 'Accept-Language: en,es-ES;q=0.8,es;q=0.5,en-US;q=0.3' \
        --compressed -H 'Content-type: application/x-www-form-urlencoded' \
        -H 'Origin: http://localhost:8983' -H 'Connection: keep-alive' \
        -H 'Referer: http://localhost:8983/solr/banana/' \
        --data 'q=*%3A*&fq=publishedDate:[2018-07-10T16:00:25.000Z%20TO%202020-01-20T16:22:59.000Z]&fq=lang_orig:"en"&stats=true&stats.field=organizations_os&stats.field=places_os&stats.field=medical_conditions_os&stats.field=medical_treatments_os&wt=json&rows=0'
```

## Changes required by ESI's Content Collector API

ESI's content collector API will be modified to include these 3 calls

Eventually we'll have the following endpoints. The [dashboard-be](https://github.com/co-inform/dashboard-be-api) component will forward the appropriate requests to ESI's API:

* https://coinform.expertsystemcustomer.com/cc/api/v1/dboard/admin/luke
* https://coinform.expertsystemcustomer.com/cc/api/v1/dboard/admin/core
* https://coinform.expertsystemcustomer.com/cc/api/v1/dboard/{collection-name}/select

which will adhere as much as possible to the responses output by Solr, but replacing some field names and values as well as collection names.

